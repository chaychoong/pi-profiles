import { createInterface } from "node:readline";
import { createProfileManager } from "../context.js";

async function confirm(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y");
    });
  });
}

export async function cmdDelete(args: string[]): Promise<void> {
  const force = args.includes("--force");
  const name = args.find((a) => !a.startsWith("-"));
  if (!name) {
    console.error("Usage: ppi delete <name> [--force]");
    process.exit(1);
  }

  const pm = createProfileManager();

  let profile;
  try {
    profile = pm.resolve(name);
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
    return; // unreachable, but helps TS
  }

  if (!force) {
    if (!process.stdin.isTTY) {
      console.error(`Cannot confirm interactively. Use --force to delete non-interactively.`);
      process.exit(1);
      return;
    }
    const yes = await confirm(
      `Delete profile "${name}" at ${profile.path}? This cannot be undone. [y/N] `
    );
    if (!yes) {
      console.log("Aborted.");
      return;
    }
  }

  try {
    pm.delete(name);
    console.log(`Profile "${name}" deleted.`);
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
}
