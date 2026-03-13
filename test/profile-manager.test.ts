import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  mkdirSync, rmSync, writeFileSync, existsSync,
  readFileSync, lstatSync, readdirSync, symlinkSync, mkdtempSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ProfileManager } from "../src/profile-manager.js";

function createTempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "ppi-test-"));
  mkdirSync(join(root, "agent"), { recursive: true });
  mkdirSync(join(root, "profiles"), { recursive: true });
  return root;
}

describe("ProfileManager", () => {
  let root: string;
  let pm: ProfileManager;

  beforeEach(() => {
    root = createTempRoot();
    pm = new ProfileManager(root);
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  describe("name validation", () => {
    it("rejects empty name", () => {
      assert.throws(() => pm.resolve(""), /invalid profile name/i);
    });

    it("rejects name with slashes", () => {
      assert.throws(() => pm.resolve("../evil"), /invalid profile name/i);
    });

    it("rejects name starting with dot", () => {
      assert.throws(() => pm.resolve(".hidden"), /invalid profile name/i);
    });

    it("rejects name starting with hyphen", () => {
      assert.throws(() => pm.resolve("-bad"), /invalid profile name/i);
    });

    it("rejects name longer than 64 chars", () => {
      assert.throws(() => pm.resolve("a".repeat(65)), /invalid profile name/i);
    });

    it("accepts valid names", () => {
      mkdirSync(join(root, "profiles", "work"));
      const profile = pm.resolve("work");
      assert.equal(profile.name, "work");
    });

    it("accepts names with dots, hyphens, underscores", () => {
      mkdirSync(join(root, "profiles", "my-profile_v2.0"));
      const profile = pm.resolve("my-profile_v2.0");
      assert.equal(profile.name, "my-profile_v2.0");
    });
  });

  describe("resolve", () => {
    it("returns profile with absolute path", () => {
      mkdirSync(join(root, "profiles", "work"));
      const profile = pm.resolve("work");
      assert.equal(profile.name, "work");
      assert.equal(profile.path, join(root, "profiles", "work"));
    });

    it("throws for non-existent profile", () => {
      assert.throws(() => pm.resolve("nope"), /does not exist/i);
    });
  });

  describe("default management", () => {
    it("returns undefined when no default is set", () => {
      assert.equal(pm.getDefault(), undefined);
    });

    it("set and get default", () => {
      mkdirSync(join(root, "profiles", "work"));
      pm.setDefault("work");
      assert.equal(pm.getDefault(), "work");
    });

    it("setDefault throws for non-existent profile", () => {
      assert.throws(() => pm.setDefault("nope"), /does not exist/i);
    });

    it("clearDefault removes default.json", () => {
      mkdirSync(join(root, "profiles", "work"));
      pm.setDefault("work");
      pm.clearDefault();
      assert.equal(pm.getDefault(), undefined);
      assert.equal(existsSync(join(root, "profiles", "default.json")), false);
    });
  });

  describe("list", () => {
    it("returns empty array when no profiles exist", () => {
      assert.deepEqual(pm.list(), []);
    });

    it("lists profiles sorted alphabetically", () => {
      mkdirSync(join(root, "profiles", "zulu"));
      mkdirSync(join(root, "profiles", "alpha"));
      const result = pm.list();
      assert.equal(result.length, 2);
      assert.equal(result[0].name, "alpha");
      assert.equal(result[1].name, "zulu");
    });

    it("marks the default profile", () => {
      mkdirSync(join(root, "profiles", "work"));
      mkdirSync(join(root, "profiles", "play"));
      pm.setDefault("work");
      const result = pm.list();
      const work = result.find((p) => p.name === "work")!;
      const play = result.find((p) => p.name === "play")!;
      assert.equal(work.isDefault, true);
      assert.equal(play.isDefault, false);
    });

    it("ignores non-directory entries", () => {
      mkdirSync(join(root, "profiles", "real"));
      writeFileSync(join(root, "profiles", "not-a-profile.txt"), "");
      pm.setDefault("real");
      const result = pm.list();
      assert.equal(result.length, 1);
      assert.equal(result[0].name, "real");
    });
  });

  describe("create", () => {
    it("scaffolds a blank profile with symlinked auth and models", () => {
      writeFileSync(join(root, "agent", "auth.json"), '{"token":"abc"}');
      writeFileSync(join(root, "agent", "models.json"), '{"models":[]}');

      pm.create("work");

      const profileDir = join(root, "profiles", "work");
      assert.ok(existsSync(profileDir));
      assert.ok(existsSync(join(profileDir, "settings.json")));
      assert.deepEqual(JSON.parse(readFileSync(join(profileDir, "settings.json"), "utf-8")), {});

      assert.ok(lstatSync(join(profileDir, "auth.json")).isSymbolicLink());
      assert.ok(lstatSync(join(profileDir, "models.json")).isSymbolicLink());

      for (const dir of ["extensions", "skills", "tools", "prompts", "sessions"]) {
        assert.ok(existsSync(join(profileDir, dir)), `${dir}/ should exist`);
      }
    });

    it("creates with shareAuth: false (copies instead of symlinks)", () => {
      writeFileSync(join(root, "agent", "auth.json"), '{"token":"abc"}');
      writeFileSync(join(root, "agent", "models.json"), '{"models":[]}');

      pm.create("work", { shareAuth: false });

      const authPath = join(root, "profiles", "work", "auth.json");
      assert.ok(!lstatSync(authPath).isSymbolicLink());
      assert.deepEqual(JSON.parse(readFileSync(authPath, "utf-8")), { token: "abc" });
      assert.ok(lstatSync(join(root, "profiles", "work", "models.json")).isSymbolicLink());
    });

    it("creates with shareModels: false (copies instead of symlinks)", () => {
      writeFileSync(join(root, "agent", "auth.json"), '{"token":"abc"}');
      writeFileSync(join(root, "agent", "models.json"), '{"models":[]}');

      pm.create("work", { shareModels: false });

      const modelsPath = join(root, "profiles", "work", "models.json");
      assert.ok(!lstatSync(modelsPath).isSymbolicLink());
      assert.deepEqual(JSON.parse(readFileSync(modelsPath, "utf-8")), { models: [] });
      assert.ok(lstatSync(join(root, "profiles", "work", "auth.json")).isSymbolicLink());
    });

    it("throws if profile already exists", () => {
      mkdirSync(join(root, "profiles", "work"));
      assert.throws(() => pm.create("work"), /already exists/i);
    });

    it("creates profile even if stock auth.json is missing", () => {
      pm.create("work");
      const profileDir = join(root, "profiles", "work");
      assert.ok(existsSync(profileDir));
      assert.ok(existsSync(join(profileDir, "settings.json")));
      assert.ok(!existsSync(join(profileDir, "auth.json")));
      assert.ok(!existsSync(join(profileDir, "models.json")));
    });
  });

  describe("clone", () => {
    it("deep-copies a profile excluding sessions", () => {
      const srcDir = join(root, "profiles", "src");
      mkdirSync(join(srcDir, "extensions"), { recursive: true });
      mkdirSync(join(srcDir, "sessions"), { recursive: true });
      writeFileSync(join(srcDir, "settings.json"), '{"model":"claude"}');
      writeFileSync(join(srcDir, "extensions", "my-ext.ts"), "export default () => {}");
      writeFileSync(join(srcDir, "sessions", "session1.json"), "{}");

      pm.clone("src", "dest");

      const destDir = join(root, "profiles", "dest");
      assert.ok(existsSync(destDir));
      assert.deepEqual(
        JSON.parse(readFileSync(join(destDir, "settings.json"), "utf-8")),
        { model: "claude" }
      );
      assert.ok(existsSync(join(destDir, "extensions", "my-ext.ts")));
      assert.ok(existsSync(join(destDir, "sessions")));
      assert.deepEqual(readdirSync(join(destDir, "sessions")), []);
    });

    it("preserves symlinks by default", () => {
      const srcDir = join(root, "profiles", "src");
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(join(root, "agent", "auth.json"), '{"token":"abc"}');
      symlinkSync(join(root, "agent", "auth.json"), join(srcDir, "auth.json"));
      writeFileSync(join(srcDir, "settings.json"), "{}");

      pm.clone("src", "dest");

      const destAuth = join(root, "profiles", "dest", "auth.json");
      assert.ok(lstatSync(destAuth).isSymbolicLink());
    });

    it("dereferences auth symlink with shareAuth: false", () => {
      const srcDir = join(root, "profiles", "src");
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(join(root, "agent", "auth.json"), '{"token":"abc"}');
      symlinkSync(join(root, "agent", "auth.json"), join(srcDir, "auth.json"));
      writeFileSync(join(srcDir, "settings.json"), "{}");

      pm.clone("src", "dest", { shareAuth: false });

      const destAuth = join(root, "profiles", "dest", "auth.json");
      assert.ok(!lstatSync(destAuth).isSymbolicLink());
      assert.deepEqual(JSON.parse(readFileSync(destAuth, "utf-8")), { token: "abc" });
    });

    it("dereferences models symlink with shareModels: false", () => {
      const srcDir = join(root, "profiles", "src");
      mkdirSync(srcDir, { recursive: true });
      writeFileSync(join(root, "agent", "models.json"), '{"models":[]}');
      symlinkSync(join(root, "agent", "models.json"), join(srcDir, "models.json"));
      writeFileSync(join(srcDir, "settings.json"), "{}");

      pm.clone("src", "dest", { shareModels: false });

      const destModels = join(root, "profiles", "dest", "models.json");
      assert.ok(!lstatSync(destModels).isSymbolicLink());
      assert.deepEqual(JSON.parse(readFileSync(destModels, "utf-8")), { models: [] });
    });

    it("throws if destination already exists", () => {
      mkdirSync(join(root, "profiles", "src"));
      writeFileSync(join(root, "profiles", "src", "settings.json"), "{}");
      mkdirSync(join(root, "profiles", "dest"));
      assert.throws(() => pm.clone("src", "dest"), /already exists/i);
    });

    it("throws if source does not exist", () => {
      assert.throws(() => pm.clone("nope", "dest"), /does not exist/i);
    });
  });

  describe("delete", () => {
    it("deletes a profile directory", () => {
      mkdirSync(join(root, "profiles", "work"));
      writeFileSync(join(root, "profiles", "work", "settings.json"), "{}");
      pm.delete("work");
      assert.ok(!existsSync(join(root, "profiles", "work")));
    });

    it("clears default if deleted profile was default", () => {
      mkdirSync(join(root, "profiles", "work"));
      pm.setDefault("work");
      pm.delete("work");
      assert.equal(pm.getDefault(), undefined);
    });

    it("preserves default if deleted profile was not default", () => {
      mkdirSync(join(root, "profiles", "work"));
      mkdirSync(join(root, "profiles", "play"));
      pm.setDefault("work");
      pm.delete("play");
      assert.equal(pm.getDefault(), "work");
    });

    it("throws for non-existent profile", () => {
      assert.throws(() => pm.delete("nope"), /does not exist/i);
    });
  });
});
