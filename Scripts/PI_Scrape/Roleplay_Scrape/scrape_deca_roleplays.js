/**
 * DECA Advisor Resource Center — Role-Play PDF scraper
 *
 * Loops the paginated /resources listing, collects every entry tagged
 * "Role-Play" (skips Exams, PDFs, Modules, Templates, Videos, Workbooks —
 * i.e. skips presentations/written events), and writes the results to a CSV.
 * Optionally downloads every PDF into ./downloads/.
 *
 * Setup:
 *   npm init -y
 *   npm install playwright
 *   npx playwright install chromium
 *
 * Run:
 *   node scrape_deca_roleplays.js
 *
 * Config below: set DOWNLOAD_PDFS to true to also download every PDF.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE_URL = 'https://www.deca.org/resources';
const PAGE_PARAM = '5d5b7fa4_page';
const MAX_PAGES = 50; // safety ceiling; script stops early if a page has 0 items
const OUTPUT_CSV = './deca_roleplays_manifest.csv';
const DOWNLOAD_PDFS = false; // flip to true to also download every PDF
const DOWNLOAD_DIR = './downloads';

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => {
      fs.unlink(destPath, () => reject(err));
    });
  });
}

async function scrapePage(page, pageNum) {
  const url = `${BASE_URL}?${PAGE_PARAM}=${pageNum}`;
  await page.goto(url, { waitUntil: 'networkidle' });

  // Each resource item is a card; adjust selector if DECA changes their markup.
  // We identify Role-Play items by the visible "Role-Play" type tag inside the card.
  const items = await page.evaluate(() => {
    const results = [];
    // Cards are anchor-wrapped blocks; grab all <a> that link to a .pdf directly,
    // then walk up to find the card and confirm it's tagged Role-Play.
    const cards = document.querySelectorAll('a[href$=".pdf"]');
    cards.forEach((a) => {
      const card = a.closest('[role], .w-dyn-item, div'); // best-effort container
      const text = card ? card.innerText : '';
      if (text.includes('Role-Play')) {
        // Try to grab a title from a heading inside the card
        const heading = card && card.querySelector('h1, h2, h3, h4, h5, h6');
        results.push({
          title: heading ? heading.innerText.trim() : '',
          pdf_url: a.href,
        });
      }
    });
    return results;
  });

  return items;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const seen = new Set();
  const rows = [];

  for (let pageNum = 1; pageNum <= MAX_PAGES; pageNum++) {
    console.log(`Scraping page ${pageNum}...`);
    const items = await scrapePage(page, pageNum);

    if (items.length === 0) {
      console.log(`No items found on page ${pageNum}, stopping.`);
      break;
    }

    for (const item of items) {
      if (!seen.has(item.pdf_url)) {
        seen.add(item.pdf_url);

        // Parse event code / year / scenario number from filename, e.g.
        // DECA_ACT_2026_District_Event_1.pdf
        const fname = item.pdf_url.split('/').pop();
        const m = fname.match(/DECA_([A-Z0-9]+)_(\d{4})_District_Event(?:_(\d+))?\.pdf/i);
        rows.push({
          event_code: m ? m[1] : '',
          year: m ? m[2] : '',
          scenario_number: m && m[3] ? m[3] : '1',
          title: item.title,
          pdf_url: item.pdf_url,
          source_page: pageNum,
        });
      }
    }
  }

  await browser.close();

  // Write CSV
  const header = 'event_code,year,scenario_number,title,pdf_url,source_page\n';
  const csvBody = rows
    .map((r) =>
      [r.event_code, r.year, r.scenario_number, `"${r.title.replace(/"/g, '""')}"`, r.pdf_url, r.source_page].join(',')
    )
    .join('\n');
  fs.writeFileSync(OUTPUT_CSV, header + csvBody);
  console.log(`\nWrote ${rows.length} unique roleplay entries to ${OUTPUT_CSV}`);

  // Optionally download PDFs
  if (DOWNLOAD_PDFS) {
    if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR);
    for (const r of rows) {
      const fname = r.pdf_url.split('/').pop().split('?')[0];
      const dest = path.join(DOWNLOAD_DIR, fname);
      if (!fs.existsSync(dest)) {
        console.log(`Downloading ${fname}...`);
        try {
          await downloadFile(r.pdf_url, dest);
        } catch (err) {
          console.error(`Failed to download ${r.pdf_url}: ${err.message}`);
        }
      }
    }
    console.log(`\nDownloaded PDFs to ${DOWNLOAD_DIR}/`);
  }
})();
