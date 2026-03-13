import { spawn } from "node:child_process";
import { constants } from "node:os";

export function launch(profilePath: string, piArgs: string[]): void {
  const env = { ...process.env, PI_CODING_AGENT_DIR: profilePath };
  const child = spawn("pi", piArgs, { env, stdio: "inherit" });

  // SIGINT is delivered to the entire foreground process group when the child
  // shares the parent's TTY (stdio: "inherit"), so both parent and child
  // receive it simultaneously. We must NOT forward it — that would double-
  // signal the child. SIGTERM and SIGHUP are sent to the parent specifically,
  // so those we forward.
  for (const sig of ["SIGTERM", "SIGHUP"] as const) {
    process.on(sig, () => child.kill(sig));
  }

  child.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "ENOENT") {
      console.error("pi not found. Install from https://pi.dev");
      process.exit(1);
    }
    throw err;
  });

  child.on("exit", (code, signal) => {
    if (code !== null) {
      process.exit(code);
    }
    // Child was killed by a signal — convention is 128 + signal number.
    const sigNum = signal ? (constants.signals[signal] ?? 1) : 1;
    process.exit(128 + sigNum);
  });
}
