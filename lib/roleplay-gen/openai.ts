export const PRACTICE_MODEL = "gpt-5-nano";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function completeJson(input: {
  system: string;
  payload: unknown;
  prior?: Array<{ draft: unknown; errors: string[] }>;
}) {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error("OPENAI_API_KEY is missing on the server.");

  const messages: ChatMessage[] = [
    { role: "system", content: input.system },
    { role: "user", content: JSON.stringify(input.payload) },
  ];
  for (const turn of input.prior ?? []) {
    messages.push({ role: "assistant", content: JSON.stringify(turn.draft) });
    messages.push({
      role: "user",
      content: `The draft failed validation. Fix every item and return one JSON object only.\n${turn.errors.map((error) => `- ${error}`).join("\n")}`,
    });
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(50_000),
    body: JSON.stringify({
      model: PRACTICE_MODEL,
      reasoning_effort: "low",
      max_completion_tokens: 8000,
      response_format: { type: "json_object" },
      messages,
    }),
  });

  const body = (await response.json()) as {
    error?: { message?: string };
    choices?: Array<{
      finish_reason?: string;
      message?: { content?: string | null; refusal?: string | null };
    }>;
  };

  if (!response.ok) {
    throw new Error(body.error?.message || `OpenAI request failed (${response.status}).`);
  }

  const choice = body.choices?.[0];
  if (choice?.message?.refusal) throw new Error("The model declined to write this scenario.");
  const content = choice?.message?.content?.trim();
  if (!content) {
    throw new Error(
      choice?.finish_reason === "length"
        ? "The model ran out of room before it finished the scenario."
        : "The model returned an empty scenario.",
    );
  }
  return content;
}
