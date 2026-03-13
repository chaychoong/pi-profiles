import { createProfileManager } from "../context.js";

export function cmdCreate(args: string[]): void {
  const name = args[0];
  if (!name || name.startsWith("-")) {
    console.error("Usage: ppi create <name> [--own-auth] [--own-models]");
    process.exit(1);
  }

  const shareAuth = !args.includes("--own-auth");
  const shareModels = !args.includes("--own-models");

  const pm = createProfileManager();
  try {
    pm.create(name, { shareAuth, shareModels });
    console.log(`Profile "${name}" created at ${pm.resolve(name).path}`);
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
}
