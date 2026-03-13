import { createProfileManager } from "../context.js";

export function cmdCreate(args: string[]): void {
  const positionals: string[] = [];
  let fromProfile: string | undefined;
  let fromBase = false;
  let shareAuth = true;
  let shareModels = true;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--from" && i + 1 < args.length) {
      fromProfile = args[++i];
    } else if (arg === "--from-base") {
      fromBase = true;
    } else if (arg === "--own-auth") {
      shareAuth = false;
    } else if (arg === "--own-models") {
      shareModels = false;
    } else if (!arg.startsWith("-")) {
      positionals.push(arg);
    }
  }

  const name = positionals[0];
  if (!name) {
    console.error(
      "Usage: ppi create <name> [--from <profile>] [--from-base] [--own-auth] [--own-models]"
    );
    process.exit(1);
  }

  const pm = createProfileManager();
  try {
    pm.create(name, { from: fromProfile, fromBase, shareAuth, shareModels });
    const source = fromProfile ? ` from "${fromProfile}"` : fromBase ? " from base" : "";
    console.log(`Created "${name}"${source} at ${pm.resolve(name).path}`);
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
}
