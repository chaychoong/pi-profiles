import { createProfileManager } from "../context.js";

export function cmdClone(args: string[]): void {
  const source = args[0];
  const dest = args[1];
  if (!source || !dest || source.startsWith("-") || dest.startsWith("-")) {
    console.error("Usage: ppi clone <source> <dest> [--own-auth] [--own-models]");
    process.exit(1);
  }

  const shareAuth = !args.includes("--own-auth");
  const shareModels = !args.includes("--own-models");

  const pm = createProfileManager();
  try {
    pm.clone(source, dest, { shareAuth, shareModels });
    console.log(`Profile "${source}" cloned to "${dest}" at ${pm.resolve(dest).path}`);
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
}
