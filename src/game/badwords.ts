const WORDS = ["fuck","shit","bitch","ass","asshole","damn","crap","dick","cock","pussy","cunt","bastard","slut","whore","fag","nigger","nigga","retard","sex","porn","nude","boob","penis","vagina","piss","hell","kill yourself","kys","wtf","stfu","fck","fuk","sh1t","b1tch","porno","horny","rape","nazi","hitler"];
const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i" };
export function norm(t: string) { return t.toLowerCase().replace(/[013457@$!]/g, (c) => LEET[c]!).replace(/[^a-z ]/g, ""); }
/** True when the text contains a bad word (as a whole word, or squished together for long ones). */
export function isInappropriate(t: string): boolean {
  const n = norm(t), words = n.split(/\s+/), squished = n.replace(/\s+/g, "");
  return WORDS.some((w) => w.includes(" ") ? n.includes(w) : words.includes(w) || (w.length >= 4 && squished.includes(w)));
}
export const STRIKE_KEY = "sunny-links-strikes";
export const LOCAL_BAN_KEY = "sunny-links-local-ban";
