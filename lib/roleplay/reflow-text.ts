export type RoleplayBlock =
  | { kind: "p"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "table"; columns: string[]; rows: string[][] };

function isBullet(line: string) {
  return /^(?:[•●▪◦]|\d+[.)])\s+\S/.test(line);
}

function bulletText(line: string) {
  return line.replace(/^(?:[•●▪◦]|\d+[.)])\s+/, "");
}

function joinWrapped(previous: string, next: string) {
  if (/ -$/.test(previous) || /—$/.test(previous)) {
    return `${previous} ${next}`;
  }
  if (/-$/.test(previous)) {
    return `${previous}${next}`;
  }
  return `${previous} ${next}`;
}

function endsSentence(text: string) {
  if (/(?:\b(?:Mr|Mrs|Ms|Dr|Inc|Jr|Sr|St|vs|etc|No|e\.g|i\.e)|\bU\.S\.)$/.test(text)) {
    return false;
  }
  return /[.!?]["'’”)]*$/.test(text);
}

function startsSentence(line: string) {
  return /^[“"']?[A-Z]/.test(line);
}

/** A new printed paragraph, not the next sentence of the one already in progress. */
function startsParagraph(next: string) {
  if (/^(?:You will|You want|The participant will)\b/.test(next)) return true;
  if (/^[A-Z]{2,}(?:\s+[A-Z]{2,})*\b/.test(next)) return true;
  if (/^The\b.+\(judge\)/.test(next) && !/\bwill begin\b/.test(next)) return true;
  return false;
}

function keepWithPrevious(paragraph: string, next: string) {
  if (/^The\b.+\(judge\) will begin\b/.test(next)) return true;
  if (/^(?:After you have|During the course|Once the|Once you)\b/.test(next)) return true;
  if (
    /^You are to assume the role of\b/.test(paragraph) &&
    !/\(judge\)/.test(paragraph) &&
    /^The\b.+\(judge\)/.test(next)
  ) {
    return true;
  }
  return false;
}

const MONTH =
  /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+$/i;
const VALUE =
  /\((?:\$\s*)?\d[\d,]*(?:\.\d+)?%?\)|(?:\$\s*)?\d[\d,]*(?:\.\d+)?%?|\?/g;
const SUBSTANTIAL =
  /\((?:\$\s*)?\d[\d,]*(?:\.\d+)?%?\)|(?:\$\s*)?\d{1,3}(?:,\d{3})+(?:\.\d+)?|(?:\$\s*)?\d+\.\d+%?|\b\d{3,}\b|\?/g;

type ValueMatch = { text: string; start: number; end: number };

function substantialCount(line: string) {
  return [...line.matchAll(SUBSTANTIAL)].length;
}

function labelWordCount(line: string) {
  return line
    .replace(VALUE, " ")
    .replace(/[()$%,?]/g, " ")
    .split(/\s+/)
    .filter((word) => /[A-Za-z]/.test(word)).length;
}

function isDataRow(line: string) {
  if (!line || isBullet(line) || /\(judge\)/i.test(line)) return false;
  if (/[.!?]["'’”)]*$/.test(line) && /[A-Za-z]{3}/.test(line)) return false;
  if (labelWordCount(line) > 8) return false;
  if (substantialCount(line) >= 2) return true;
  if (substantialCount(line) === 1 && /\$/.test(line)) return true;
  if (substantialCount(line) >= 1 && /^(?:19|20)\d{2}\b/.test(line)) return true;
  return false;
}

function isTableTail(line: string) {
  if (!line || isBullet(line) || /\(judge\)/i.test(line) || /[.!?]$/.test(line)) return false;
  if (/^(?:You|After|Once|During|The participant)\b/.test(line)) return false;
  return /\d|\?/.test(line) && line.split(/\s+/).length <= 8;
}

function isPossibleHeader(line: string) {
  if (!line || isDataRow(line) || isBullet(line) || /\(judge\)/i.test(line)) return false;
  if (/[.!?]$/.test(line)) return false;
  const words = line.split(/\s+/);
  return words.length >= 2 && words.length <= 14 && /^[A-Z0-9(]/.test(line);
}

function valueMatches(line: string): ValueMatch[] {
  return [...line.matchAll(VALUE)]
    .map((match) => ({
      text: match[0].replace(/\$\s+/g, "$").replace(/\s+/g, ""),
      start: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
    }))
    .filter((match) => {
      const before = line.slice(0, match.start);
      return !(MONTH.test(before) && /^\d{1,2}$/.test(match.text));
    });
}

function groupedNumber(value: string) {
  return /^\d{1,3}(?:,\d{3})+$/.test(value);
}

function joinSplits(matches: ValueMatch[], line: string, limit: number | null) {
  const next: ValueMatch[] = [];
  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index]!;
    const following = matches[index + 1];
    const adjacent = following ? line.slice(current.end, following.start).trim() === "" : false;
    const singleDigit = /^\d$/.test(current.text);
    const brokenZero = following ? /^0[\d,]/.test(following.text) : false;
    const overstuffed = limit !== null && matches.length - (index - next.length) > limit;
    const canJoin =
      adjacent &&
      singleDigit &&
      following &&
      groupedNumber(current.text + following.text) &&
      (brokenZero || (overstuffed && following.text.includes(",")));
    if (canJoin && following) {
      next.push({
        text: current.text + following.text,
        start: current.start,
        end: following.end,
      });
      index += 1;
      continue;
    }
    next.push(current);
  }
  return next;
}

function modeCount(counts: number[]) {
  const tally = new Map<number, number>();
  for (const count of counts) tally.set(count, (tally.get(count) ?? 0) + 1);
  let best = counts[0] ?? 0;
  let bestVotes = -1;
  for (const [count, votes] of tally) {
    if (votes > bestVotes || (votes === bestVotes && count < best)) {
      best = count;
      bestVotes = votes;
    }
  }
  return best;
}

function glueHeader(parts: string[], count: number) {
  const out = [...parts];
  while (out.length > count) {
    const index = out.findIndex(
      (word, wordIndex) => wordIndex < out.length - 1 && /^(?:Unit|Total|Net|Current|Gross|Cash)$/.test(word),
    );
    if (index < 0) break;
    out.splice(index, 2, `${out[index]} ${out[index + 1]}`);
  }
  return out;
}

function splitHeader(line: string, count: number) {
  const years = [...line.matchAll(/\bYear\s+\d+\b|\bCurrent\s+Year\b/g)].map((match) =>
    match[0].replace(/\s+/g, " "),
  );
  if (years.length === count) return years;

  const bits = line.match(/(?:\([^)]*\)|\S)+/g) ?? [];
  const merged: string[] = [];
  for (const bit of bits) {
    if (bit.startsWith("(") && merged.length) merged[merged.length - 1] += ` ${bit}`;
    else merged.push(bit);
  }
  if (merged.length === count) return merged;
  const glued = glueHeader(merged, count);
  return glued.length === count ? glued : null;
}

function parseTable(lines: string[]): { caption: string | null; block: RoleplayBlock } {
  let caption: string | null = null;
  let body = lines;
  if (!isDataRow(lines[0] ?? "")) {
    caption = lines[0] ?? null;
    body = lines.slice(1);
  }

  const rough = body.map((line) => joinSplits(valueMatches(line), line, null));
  const valueCount = modeCount(rough.map((matches) => matches.length));
  const rows = body.map((line) => {
    const matches = joinSplits(valueMatches(line), line, valueCount);
    const label = matches.length ? line.slice(0, matches[0]!.start).replace(/\s+/g, " ").trim() : line.trim();
    const values = matches.map((match) => match.text);
    while (values.length < valueCount) values.push("");
    return label ? [label, ...values] : values;
  });

  const labeled = rows.some((row, index) => {
    const source = body[index] ?? "";
    const matches = joinSplits(valueMatches(source), source, valueCount);
    return matches.length > 0 && source.slice(0, matches[0]!.start).trim().length > 0;
  });
  const titles = caption ? splitHeader(caption, valueCount) : null;
  const columns = titles
    ? labeled
      ? ["", ...titles]
      : titles
    : rows[0]?.map(() => "") ?? [];
  if (titles) caption = null;

  const width = Math.max(columns.length, ...rows.map((row) => row.length));
  while (columns.length < width) columns.push("");
  for (const row of rows) {
    while (row.length < width) row.push("");
  }

  return { caption: titles ? null : caption, block: { kind: "table", columns, rows } };
}

function takeTable(lines: string[], start: number) {
  let index = start;
  const collected: string[] = [];
  const first = lines[index]?.trim() ?? "";
  if (isPossibleHeader(first) && isDataRow(lines[index + 1]?.trim() ?? "")) {
    collected.push(first);
    index += 1;
  }

  let dataRows = 0;
  while (index < lines.length) {
    const line = lines[index]?.trim() ?? "";
    if (!line) break;
    if (isDataRow(line) || (dataRows > 0 && isTableTail(line))) {
      collected.push(line);
      if (isDataRow(line)) dataRows += 1;
      index += 1;
      continue;
    }
    break;
  }

  if (dataRows < 2) return null;
  return { end: index, ...parseTable(collected) };
}

/** Undo PDF line wraps so roleplay prose reads as paragraphs, lists, and tables. */
export function reflowRoleplayText(raw: string): RoleplayBlock[] {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const maxLen = lines.reduce((max, line) => Math.max(max, line.trim().length), 0);
  const blocks: RoleplayBlock[] = [];
  let paragraph = "";
  let lastLine = "";
  let list: string[] | null = null;

  function flushParagraph() {
    const text = paragraph.replace(/\s+/g, " ").trim();
    paragraph = "";
    lastLine = "";
    if (text) blocks.push({ kind: "p", text });
  }

  function flushList() {
    if (list?.length) blocks.push({ kind: "list", items: list });
    list = null;
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? "";
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    if (!isBullet(line)) {
      const table = takeTable(lines.map((item) => item.trim()), index);
      if (table) {
        flushParagraph();
        flushList();
        if (table.caption) blocks.push({ kind: "p", text: table.caption });
        blocks.push(table.block);
        index = table.end - 1;
        continue;
      }
    }

    if (isBullet(line)) {
      flushParagraph();
      list = list ?? [];
      list.push(bulletText(line).replace(/\s+/g, " ").trim());
      continue;
    }

    if (list) {
      const last = list.length - 1;
      if (last >= 0 && !/[.!?]$/.test(list[last]) && /^[a-z("]/.test(line)) {
        list[last] = joinWrapped(list[last], line);
        continue;
      }
      flushList();
    }

    const shortLine = lastLine.length > 0 && lastLine.length <= maxLen - 12;
    const newParagraph =
      paragraph &&
      endsSentence(paragraph) &&
      startsSentence(line) &&
      !keepWithPrevious(paragraph, line) &&
      (shortLine || startsParagraph(line));

    if (newParagraph) flushParagraph();
    paragraph = paragraph ? joinWrapped(paragraph, line) : line;
    lastLine = line;
  }

  flushParagraph();
  flushList();
  return blocks;
}
