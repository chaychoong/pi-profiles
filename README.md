# pi-profiles

Configuration profile manager for [pi](https://pi.dev). Switch between
independent sets of settings, extensions, skills, themes, and auth with a
single command.

Inspired by [chemacs](https://github.com/plexus/chemacs2) (Emacs profile
switcher) and Neovim's `NVIM_APPNAME`.

## How it works

Pi resolves its configuration directory via `PI_CODING_AGENT_DIR`. `ppi`
creates and manages profile directories under `~/.pi/profiles/<name>/`,
then launches pi with the env var pointed at the chosen profile. Pi doesn't
know it's being wrapped - the TUI renders directly through inherited stdio.

## Install

```bash
npm install -g pi-profiles
```

Requires [pi](https://pi.dev) and Node.js (which you already have if you
have pi).

## Usage

```bash
# Create a profile
ppi create work
ppi create personal --own-auth    # independent API key

# List profiles
ppi list

# Set a default
ppi set-default work

# Launch pi with a profile
ppi use work
ppi                               # launches the default profile
ppi use work -- -p "fix the bug"  # pass args to pi after --

# Clone a profile
ppi clone work experiments

# Delete a profile
ppi delete experiments            # interactive confirmation
ppi delete experiments --force    # skip confirmation
```

## What a profile looks like

Each profile is a complete pi agentDir:

```
~/.pi/profiles/work/
├── settings.json
├── auth.json → ~/.pi/agent/auth.json  (symlink by default)
├── models.json → ~/.pi/agent/models.json
├── extensions/
├── skills/
├── tools/
├── prompts/
└── sessions/
```

Auth and models are symlinked from the stock pi config by default, so one
`pi login` works everywhere. Pass `--own-auth` or `--own-models` to
`create` or `clone` for independent credentials.

## Goals

- **Full isolation.** Each profile is its own agentDir - settings,
  extensions, skills, themes, auth, sessions, prompts. Switching profiles
  means switching everything.

- **Zero pi modifications.** Works entirely through the documented
  `PI_CODING_AGENT_DIR` env var and convention. No patches, no forks.

- **Zero runtime dependencies.** Pure Node.js filesystem operations.
  Hand-rolled arg parser. Nothing to install beyond this package.

- **Library + CLI.** `ProfileManager` class can be used programmatically
  (e.g., by a future orchestrator calling `createAgentSession({ agentDir })`).
  The CLI is a thin wrapper.

- **Composable.** Profile paths are predictable (`~/.pi/profiles/<name>/`),
  so they work with external tools:
  ```bash
  docker run -v ~/.pi/profiles/work:/root/.pi/agent pi-image
  ```

## Non-goals

- **Process-level sandboxing.** Profiles manage *which config* to use, not
  *where code runs*. Docker, VMs, and bubblewrap are orthogonal
  infrastructure concerns. Pi's built-in sandbox extension handles
  tool-level restrictions within a profile.

- **Agent orchestration.** Spawning multiple concurrent agents with
  different profiles is a motivating future use case, but the orchestrator
  itself is a separate project.

- **Runtime settings patching.** No mid-session model/tool switching.
  Pi's built-in `/model` command handles that.

- **Registry file.** Profiles live at `~/.pi/profiles/<name>/` by
  convention. No mapping file to maintain. The filesystem is the registry.

## Programmatic usage

```typescript
import { ProfileManager } from "pi-profiles";

const pm = new ProfileManager();
const profile = pm.resolve("work");
console.log(profile.path); // ~/.pi/profiles/work

// Use with pi's SDK
import { createAgentSession } from "@mariozechner/pi-coding-agent";
const { session } = await createAgentSession({ agentDir: profile.path });
```
