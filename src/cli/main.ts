#!/usr/bin/env node

import { printHelp, printVersion } from "./help.js";
import { cmdUse } from "./commands/use.js";
import { cmdList } from "./commands/list.js";
import { cmdCreate } from "./commands/create.js";
import { cmdClone } from "./commands/clone.js";
import { cmdDelete } from "./commands/delete.js";
import { cmdSetDefault } from "./commands/set-default.js";

const args = process.argv.slice(2);

function main(args: string[]): void {
  if (args.length === 0) {
    cmdUse([]);
    return;
  }

  const first = args[0];

  if (first === "--help" || first === "-h") {
    printHelp();
    return;
  }

  if (first === "--version" || first === "-v") {
    printVersion();
    return;
  }

  if (first === "--") {
    cmdUse(args.slice(1));
    return;
  }

  switch (first) {
    case "use":
      cmdUse(args.slice(1));
      break;
    case "list":
      cmdList(args.slice(1));
      break;
    case "create":
      cmdCreate(args.slice(1));
      break;
    case "clone":
      cmdClone(args.slice(1));
      break;
    case "delete":
      cmdDelete(args.slice(1)).catch((err) => {
        console.error(err.message);
        process.exit(1);
      });
      break;
    case "set-default":
      cmdSetDefault(args.slice(1));
      break;
    default:
      console.error(`Unknown command: ${first}`);
      printHelp();
      process.exit(1);
  }
}

main(args);
