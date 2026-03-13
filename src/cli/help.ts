export function printHelp(): void {
  console.log(`Usage: ppi [command] [options]

Launching:
  ppi [-- <pi args...>]                     Launch pi with default profile
  ppi use <name> [-- <pi args...>]          Launch pi with named profile

Profile management:
  ppi list                                  List profiles (* = default)
  ppi create <name> [--own-auth] [--own-models]
  ppi clone <source> <dest> [--own-auth] [--own-models]
  ppi delete <name> [--force]               Delete (confirms interactively)
  ppi set-default <name>                    Set default profile

Options:
  --help, -h                                Show this help message
  --version, -v                             Show version`);
}

export function printVersion(): void {
  console.log("ppi 0.1.0");
}
