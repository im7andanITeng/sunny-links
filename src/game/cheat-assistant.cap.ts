/**
 * Phone-build stand-in for the cheat assistant server function. The static
 * Capacitor bundle has no server behind it, so the AI cheat assistant is a
 * web-version feature; admins see this message if they try it on the phone.
 */
export const cheatAssistant = async (): Promise<never> => {
  throw new Error("The cheat assistant only works in the web version of the game.");
};
