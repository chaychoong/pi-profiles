export function printHelp(): void {
  console.log(`Usage: ppi [command] [options]

Launching:
  ppi [-- <pi args...>]                     Launch pi with default profile
  ppi use <name> [-- <pi args...>]          Launch pi with named profile

Profile management:
  ppi list                                  List profiles (* = default)
  ppi create <name> [options]               Create a blank profile
  ppi create <name> --from <profile>        Copy from an existing profile
  ppi create <name> --from-base             Copy from stock ~/.pi/agent/
  ppi delete <name> [--force]               Delete (confirms interactively)
  ppi set-default <name>                    Set default profile

Create options:
  --own-auth                                Independent auth (copy, not symlink)
  --own-models                              Independent models (copy, not symlink)

Options:
  --help, -h                                Show this help message
  --version, -v                             Show version`);
}

export function printVersion(): void {
  console.log("ppi 0.1.0");
}
