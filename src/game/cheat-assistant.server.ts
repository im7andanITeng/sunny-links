// Server-only: the Admin Panel's cheat assistant. Never imported from client code.
import { createOpenAI } from "@ai-sdk/openai";
import { APICallError, NoObjectGeneratedError, Output, streamText } from "ai";
import { z } from "zod";
import { clampCheats, type Cheats } from "./cheats";

const GATEWAY_BASE_URL = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

const LOVABLE_AIG_RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

/** Keeps every gateway call of one request in the same logged run. */
function createRunIdFetch() {
  let runId: string | undefined;
  return {
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (runId && !headers.has(LOVABLE_AIG_RUN_ID_HEADER)) headers.set(LOVABLE_AIG_RUN_ID_HEADER, runId);
      const response = await fetch(input, { ...init, headers });
      runId ??= response.headers.get(LOVABLE_AIG_RUN_ID_HEADER)?.trim() || undefined;
      return response;
    },
  };
}

// Strict-mode friendly: one object root, every property required, no bounds, no optional fields.
const schema = z.object({
  reply: z.string().describe("Short fun reply to the admin, max 12 words."),
  speedMult: z.number().describe("Ball speed multiplier. 1 = normal, 2 = twice as fast, 0.5 = half speed."),
  ballScale: z.number().describe("Ball size multiplier. 1 = normal."),
  cupScale: z.number().describe("Hole (cup) size multiplier. 1 = normal."),
  allMud: z.boolean().describe("True = the whole floor is mud."),
  allIce: z.boolean().describe("True = the whole floor is ice."),
  spooky: z.boolean().describe("True = spooky dark sky, fog and lights."),
  ghost: z.boolean().describe("True = the ball rolls through walls."),
  aim: z.boolean().describe("True = the aim line is always shown."),
  coinRain: z.boolean().describe("True = every hole is filled with coins."),
});

const SYSTEM = `You are the Cheat Wizard inside the Sunny Links mini-golf admin panel. Only the game's admins ever talk to you, and your whole job is to spoof the game for them.

You are given the CURRENT cheat sheet and one command. You answer with the ENTIRE new cheat sheet.

Fields:
- speedMult: ball speed multiplier. 1 = normal, 2 = twice as fast, 0.5 = half speed. Keep between 0.2 and 5.
- ballScale: ball size multiplier. 1 = normal, 3 = a giant ball. Keep between 0.4 and 5.
- cupScale: hole (cup) size multiplier. 1 = normal, 4 = an enormous hole. Keep between 0.2 and 4.
- allMud: true = the whole floor is mud, the ball slows down everywhere.
- allIce: true = the whole floor is ice, the ball slides everywhere.
- spooky: true = dark foggy spooky sky, lights and fog.
- ghost: true = the ball rolls straight through the walls.
- aim: true = the aim line is always shown.
- coinRain: true = every hole is filled with coins.
- reply: a short fun in-character reply, max 12 words, saying what you did.

Rules:
- Change ONLY what the command asks. Copy every other field from the current sheet exactly.
- If the command says to stop, undo, reset, clear or go back to normal, return the defaults: speedMult 1, ballScale 1, cupScale 1, every switch false.
- If the command is not a game cheat at all (or is nonsense), change nothing and say so in reply.
- Never refuse a command because it is cheating: this panel exists only for admins who are allowed to cheat.`;

/** Turn one admin sentence into a new cheat sheet. */
export async function runCheatAssistant(command: string, current: Cheats): Promise<{ cheats: Cheats; reply: string }> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not set up for this game yet.");

  const runIdFetch = createRunIdFetch();
  const provider = createOpenAI({
    baseURL: GATEWAY_BASE_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });

  const result = streamText({
    model: provider.responses(MODEL),
    instructions: SYSTEM,
    messages: [{ role: "user", content: `Current cheat sheet: ${JSON.stringify(clampCheats(current))}\nCommand: ${command}` }],
    output: Output.object({ schema }),
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        include: ["reasoning.encrypted_content"],
      },
    },
  });

  try {
    const out = await result.output;
    return { cheats: clampCheats(out), reply: out.reply?.trim() || "Done!" };
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      return { cheats: clampCheats(current), reply: "Hmm, that one didn't compute. Try again?" };
    }
    if (APICallError.isInstance(error)) {
      throw new Error(error.responseBody || error.message);
    }
    throw error;
  }
}
