import { createProfileManager } from "../context.js";

export function cmdList(_args: string[]): void {
  const pm = createProfileManager();
  const profiles = pm.list();

  if (profiles.length === 0) {
    console.log("No profiles found. Create one with `ppi create <name>`.");
    return;
  }

  for (const p of profiles) {
    const marker = p.isDefault ? "* " : "  ";
    console.log(`${marker}${p.name}\t${p.path}`);
  }
}
