import { createProfileManager } from "../context.js";

export function cmdSetDefault(args: string[]): void {
  const name = args[0];
  if (!name) {
    console.error("Usage: ppi set-default <name>");
    process.exit(1);
  }

  const pm = createProfileManager();
  try {
    pm.setDefault(name);
    console.log(`Default profile set to "${name}".`);
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
}
