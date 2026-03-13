import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// test/cli.test.ts compiles to dist/test/cli.test.js
// so ".." from dist/test/ gets us to dist/, then src/cli/main.js
const CLI_PATH = join(import.meta.dirname, "..", "src", "cli", "main.js");

function run(args: string[], piRoot: string): { stdout: string; stderr: string; status: number } {
  try {
    const stdout = execFileSync("node", [CLI_PATH, ...args], {
      env: { ...process.env, PPI_PI_ROOT: piRoot },
      encoding: "utf-8",
      timeout: 5000,
    });
    return { stdout, stderr: "", status: 0 };
  } catch (err: any) {
    return {
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? "",
      status: err.status ?? 1,
    };
  }
}

function createTempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "ppi-cli-test-"));
  mkdirSync(join(root, "agent"), { recursive: true });
  mkdirSync(join(root, "profiles"), { recursive: true });
  return root;
}

describe("CLI", () => {
  let root: string;

  beforeEach(() => {
    root = createTempRoot();
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("--help shows usage", () => {
    const { stdout } = run(["--help"], root);
    assert.ok(stdout.includes("Usage: ppi"));
  });

  it("--version shows version", () => {
    const { stdout } = run(["--version"], root);
    assert.ok(stdout.includes("0.1.0"));
  });

  it("list shows no profiles initially", () => {
    const { stdout } = run(["list"], root);
    assert.ok(stdout.includes("No profiles found"));
  });

  it("create + list + set-default round trip", () => {
    writeFileSync(join(root, "agent", "auth.json"), "{}");
    writeFileSync(join(root, "agent", "models.json"), "{}");

    let result = run(["create", "work"], root);
    assert.equal(result.status, 0);
    assert.ok(existsSync(join(root, "profiles", "work", "settings.json")));

    result = run(["list"], root);
    assert.ok(result.stdout.includes("work"));

    result = run(["set-default", "work"], root);
    assert.equal(result.status, 0);

    result = run(["list"], root);
    assert.ok(result.stdout.includes("*"));
    assert.ok(result.stdout.includes("work"));
  });

  it("clone copies profile", () => {
    writeFileSync(join(root, "agent", "auth.json"), "{}");
    writeFileSync(join(root, "agent", "models.json"), "{}");

    run(["create", "src"], root);
    const result = run(["clone", "src", "dest"], root);
    assert.equal(result.status, 0);
    assert.ok(existsSync(join(root, "profiles", "dest", "settings.json")));
  });

  it("delete --force removes profile", () => {
    writeFileSync(join(root, "agent", "auth.json"), "{}");
    writeFileSync(join(root, "agent", "models.json"), "{}");

    run(["create", "work"], root);
    const result = run(["delete", "work", "--force"], root);
    assert.equal(result.status, 0);
    assert.ok(!existsSync(join(root, "profiles", "work")));
  });

  it("unknown command shows error", () => {
    const { status, stderr } = run(["bogus"], root);
    assert.equal(status, 1);
  });
});
