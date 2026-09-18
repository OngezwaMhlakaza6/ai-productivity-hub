import { createFileRoute } from "@tanstack/react-router";
import { streamText } from "ai";
import { z } from "zod";

import { attachRunId, createAiProvider, getIncomingRunId } from "@/lib/ai-gateway.server";

const RequestSchema = z.object({
  tool: z.enum(["email", "meeting", "research"]),
  input: z.string().trim().min(10).max(50_000),
  tone: z.enum(["Formal", "Friendly", "Persuasive"]).optional(),
});

const prompts = {
  email: (input: string, tone = "Formal") => `Write a complete professional email using only the context below.
Tone: ${tone}
Include a specific subject line, natural greeting, concise body, clear next step, and an appropriate sign-off. Do not invent names, dates, commitments, or facts. Use [bracketed placeholders] only where essential information is missing. Return only the finished email in plain text.

Context:
${input}`,
  meeting: (input: string) => `Turn the meeting notes below into an accurate, concise professional brief.
Use exactly these sections in this order:
SUMMARY
KEY DECISIONS
ACTION ITEMS
DEADLINES

Use short bullets under the last three headings. For action items, include an owner only when explicitly stated. For deadlines, preserve exact dates and responsible people when stated. Write "None explicitly stated" when a section has no supporting information. Do not infer or invent details.

Meeting notes:
${input}`,
  research: (input: string) => `Act as a careful workplace research analyst. Synthesize the supplied topic or source content into a practical brief.
Use exactly these sections in this order:
OVERVIEW
KEY INSIGHTS
IMPORTANT FINDINGS
PRACTICAL RECOMMENDATIONS

Use concise paragraphs and bullets. Clearly distinguish facts present in the material from reasonable recommendations. Do not fabricate evidence, quotations, statistics, or sources. If the material is limited, say what cannot be verified.

Topic or source material:
${input}`,
};

async function resolveResearchInput(input: string) {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return input;
  }

  if (!["http:", "https:"].includes(url.protocol)) return input;
  const hostname = url.hostname.toLowerCase();
  const isPrivate =
    hostname === "localhost" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname.endsWith(".local") ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
  if (isPrivate) throw new Error("That URL cannot be accessed. Please paste the article text instead.");

  const response = await fetch(url, {
    headers: { "User-Agent": "AI-Workplace-Productivity-Assistant/1.0" },
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error("The article could not be opened. Please paste its text instead.");
  }
  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("text/html") && !type.includes("text/plain")) {
    throw new Error("That link is not a readable article. Please paste the article text instead.");
  }
  const raw = (await response.text()).slice(0, 150_000);
  const text = type.includes("text/html")
    ? raw
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&#39;/gi, "'")
        .replace(/&quot;/gi, '"')
        .replace(/\s+/g, " ")
        .trim()
    : raw.trim();
  if (text.length < 100) throw new Error("The article had too little readable text. Please paste it instead.");
  return `Source URL: ${url.toString()}\n\nExtracted article text:\n${text.slice(0, 45_000)}`;
}

function errorMessage(status: number, fallback: string) {
  if (status === 400) return "The request could not be processed. Please shorten or revise your input.";
  if (status === 401) return "AI access is not configured correctly.";
  if (status === 402) return fallback || "AI credits are unavailable. The workspace owner can add credits in Lovable.";
  if (status === 403) return fallback || "AI access is currently blocked by workspace settings.";
  if (status === 429) return "The AI service is busy. Please wait a moment and try again.";
  if (status >= 500) return "The AI service is temporarily unavailable. Please try again shortly.";
  return fallback || "The request could not be completed.";
}

export const Route = createFileRoute("/api/assistant")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return Response.json(
            { error: "Add at least 10 characters of useful context before generating." },
            { status: 400 },
          );
        }

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) {
          return Response.json({ error: "AI access is not configured correctly." }, { status: 401 });
        }

        const gateway = createAiProvider(apiKey, getIncomingRunId(request));
        const { tool, input, tone } = parsed.data;

        try {
          const resolvedInput = tool === "research" ? await resolveResearchInput(input) : input;
          const result = streamText({
            model: gateway.model,
            prompt: prompts[tool](resolvedInput, tone),
            maxRetries: 0,
            abortSignal: request.signal,
            providerOptions: {
              openai: {
                forceReasoning: true,
                reasoningEffort: "medium",
                reasoningSummary: "auto",
                store: false,
                include: ["reasoning.encrypted_content"],
              },
            },
          });

          return attachRunId(result.toTextStreamResponse(), gateway);
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            return new Response(null, { status: 499 });
          }
          const status =
            typeof error === "object" && error && "statusCode" in error
              ? Number(error.statusCode)
              : 500;
          const message = error instanceof Error ? error.message : "";
          return Response.json({ error: errorMessage(status, message) }, { status });
        }
      },
    },
  },
});