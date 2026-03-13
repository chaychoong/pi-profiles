import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  readdirSync,
  statSync,
  lstatSync,
  symlinkSync,
  readlinkSync,
  rmSync,
  copyFileSync,
} from "node:fs";
import { join, resolve, dirname } from "node:path";
import { homedir } from "node:os";
import type { Profile, ProfileSummary, CreateOpts, CloneOpts } from "./types.js";

const NAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
const MAX_NAME_LENGTH = 64;

export class ProfileManager {
  readonly piRoot: string;
  readonly profilesDir: string;
  readonly agentDir: string;

  constructor(piRoot?: string) {
    this.piRoot = piRoot ?? join(homedir(), ".pi");
    this.profilesDir = join(this.piRoot, "profiles");
    this.agentDir = join(this.piRoot, "agent");
  }

  private validateName(name: string): void {
    if (!name || name.length > MAX_NAME_LENGTH || !NAME_REGEX.test(name)) {
      throw new Error(
        `Invalid profile name "${name}". Names must match ${NAME_REGEX} and be at most ${MAX_NAME_LENGTH} characters.`
      );
    }
  }

  private profilePath(name: string): string {
    return join(this.profilesDir, name);
  }

  private defaultJsonPath(): string {
    return join(this.profilesDir, "default.json");
  }

  resolve(name: string): Profile {
    this.validateName(name);
    const path = this.profilePath(name);
    if (!existsSync(path)) {
      throw new Error(`Profile "${name}" does not exist at ${path}`);
    }
    return { name, path };
  }

  getDefault(): string | undefined {
    const p = this.defaultJsonPath();
    if (!existsSync(p)) return undefined;
    try {
      const data = JSON.parse(readFileSync(p, "utf-8"));
      return data.default ?? undefined;
    } catch {
      return undefined;
    }
  }

  setDefault(name: string): void {
    this.resolve(name); // validates name + existence
    mkdirSync(this.profilesDir, { recursive: true });
    writeFileSync(
      this.defaultJsonPath(),
      JSON.stringify({ default: name }, null, 2) + "\n"
    );
  }

  clearDefault(): void {
    const p = this.defaultJsonPath();
    if (existsSync(p)) {
      unlinkSync(p);
    }
  }

  list(): ProfileSummary[] {
    if (!existsSync(this.profilesDir)) return [];
    const defaultName = this.getDefault();
    return readdirSync(this.profilesDir)
      .filter((entry) => {
        try {
          return statSync(join(this.profilesDir, entry)).isDirectory();
        } catch {
          return false;
        }
      })
      .sort()
      .map((name) => ({
        name,
        path: join(this.profilesDir, name),
        isDefault: name === defaultName,
      }));
  }

  create(name: string, opts?: CreateOpts): void {
    this.validateName(name);
    const profileDir = this.profilePath(name);
    if (existsSync(profileDir)) {
      throw new Error(`Profile "${name}" already exists at ${profileDir}`);
    }

    const shareAuth = opts?.shareAuth ?? true;
    const shareModels = opts?.shareModels ?? true;

    mkdirSync(profileDir, { recursive: true });
    for (const dir of ["extensions", "skills", "tools", "prompts", "sessions"]) {
      mkdirSync(join(profileDir, dir));
    }

    writeFileSync(join(profileDir, "settings.json"), "{}\n");

    const stockAuth = join(this.agentDir, "auth.json");
    if (existsSync(stockAuth)) {
      if (shareAuth) {
        symlinkSync(stockAuth, join(profileDir, "auth.json"));
      } else {
        copyFileSync(stockAuth, join(profileDir, "auth.json"));
      }
    }

    const stockModels = join(this.agentDir, "models.json");
    if (existsSync(stockModels)) {
      if (shareModels) {
        symlinkSync(stockModels, join(profileDir, "models.json"));
      } else {
        copyFileSync(stockModels, join(profileDir, "models.json"));
      }
    }
  }

  clone(source: string, dest: string, opts?: CloneOpts): void {
    const srcProfile = this.resolve(source);
    this.validateName(dest);
    const destDir = this.profilePath(dest);
    if (existsSync(destDir)) {
      throw new Error(`Profile "${dest}" already exists at ${destDir}`);
    }

    const shareAuth = opts?.shareAuth ?? true;
    const shareModels = opts?.shareModels ?? true;

    // Deep copy preserving symlinks, excluding sessions/ contents.
    // Node's cpSync does NOT preserve symlinks (it follows them), so we
    // use a custom recursive copy.
    this.copyDirPreservingSymlinks(srcProfile.path, destDir, "sessions");

    // Ensure sessions/ dir exists (its contents were excluded)
    mkdirSync(join(destDir, "sessions"), { recursive: true });

    // Handle auth/models symlink dereferencing if requested
    for (const [file, share] of [
      ["auth.json", shareAuth],
      ["models.json", shareModels],
    ] as const) {
      const filePath = join(destDir, file);
      if (!share && existsSync(filePath) && lstatSync(filePath).isSymbolicLink()) {
        const target = readlinkSync(filePath);
        unlinkSync(filePath);
        // Resolve symlink target relative to its location
        const resolvedTarget = resolve(dirname(filePath), target);
        copyFileSync(resolvedTarget, filePath);
      }
    }
  }

  delete(name: string): void {
    const profile = this.resolve(name);
    const defaultName = this.getDefault();
    rmSync(profile.path, { recursive: true, force: true });
    if (defaultName === name) {
      this.clearDefault();
    }
  }

  /**
   * Recursively copy a directory, preserving symlinks as symlinks.
   * Skips contents of `excludeDir` (but creates the dir itself).
   */
  private copyDirPreservingSymlinks(src: string, dest: string, excludeDir?: string): void {
    mkdirSync(dest, { recursive: true });
    for (const entry of readdirSync(src)) {
      const srcPath = join(src, entry);
      const destPath = join(dest, entry);
      const stat = lstatSync(srcPath);

      if (stat.isSymbolicLink()) {
        const linkTarget = readlinkSync(srcPath);
        symlinkSync(linkTarget, destPath);
      } else if (stat.isDirectory()) {
        if (entry === excludeDir) {
          mkdirSync(destPath, { recursive: true });
        } else {
          this.copyDirPreservingSymlinks(srcPath, destPath);
        }
      } else {
        copyFileSync(srcPath, destPath);
      }
    }
  }
}
