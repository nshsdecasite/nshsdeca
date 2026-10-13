/** Pull the two judge questions out of an official judge page. */
export function extractJudgeQuestions(text: string | null | undefined): string[] {
  if (!text?.trim()) return [];
  const marker = text.search(/ask the following questions|following questions of each participant/i);
  if (marker < 0) return [];

  const slice = text.slice(marker);
  const stop = slice.search(/\n\s*(?:Once|After|When|The participant will|You will conclude)\b/i);
  const block = stop > 0 ? slice.slice(0, stop) : slice;
  const questions: string[] = [];
  const pattern = /(?:^|\n)\s*(?:\d+[.)]|[•●])\s+([\s\S]*?)(?=(?:\n\s*(?:\d+[.)]|[•●])\s)|$)/g;

  for (const match of block.matchAll(pattern)) {
    const question = match[1]
      .replace(/\s+/g, " ")
      .replace(/\s+\d{1,2}(?=\s+[A-Z])/g, "")
      .trim();
    if (question.length > 8) questions.push(question);
    if (questions.length === 2) break;
  }

  return questions;
}
