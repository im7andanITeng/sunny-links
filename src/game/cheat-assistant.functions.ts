import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Cheats } from "./cheats";

/** Admin-only cheat assistant: one plain-English command in, a new cheat sheet out. */
export const cheatAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { command: string; current: Cheats }) => input)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Only admins can use the cheat assistant.");

    const command = data.command?.trim();
    if (!command) throw new Error("Type a command first.");

    const { runCheatAssistant } = await import("./cheat-assistant.server");
    return runCheatAssistant(command.slice(0, 400), data.current);
  });
