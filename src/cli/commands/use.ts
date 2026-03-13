import { createProfileManager } from "../context.js";
import { launch } from "../launch.js";

export function cmdUse(args: string[]): void {
  const pm = createProfileManager();

  // Split on "--" to separate profile name from pi args
  const dashIdx = args.indexOf("--");
  const ownArgs = dashIdx === -1 ? args : args.slice(0, dashIdx);
  const piArgs = dashIdx === -1 ? [] : args.slice(dashIdx + 1);

  const name = ownArgs[0];

  const profileName = name || pm.getDefault();
  if (!profileName) {
    console.error("No default profile set. Use `ppi set-default <name>` or `ppi use <name>`.");
    process.exit(1);
    return; // unreachable, helps TS
  }

  try {
    const profile = pm.resolve(profileName);
    launch(profile.path, piArgs);
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
}
