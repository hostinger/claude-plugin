#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";

const source = process.argv[2] ?? "latest";
const outDir = path.join(import.meta.dirname, "..", "skills");
const work = mkdtempSync(path.join(tmpdir(), "hostinger-skills-"));

function resolveSkillsRoot() {
  if (existsSync(source) && statSync(source).isDirectory()) {
    const root = path.resolve(source);
    return { root, label: root };
  }

  const spec = `hostinger-api-mcp@${source}`;
  const packed = execFileSync("npm", ["pack", spec, "--silent", "--pack-destination", work], {
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .pop();
  execFileSync("tar", ["xzf", path.join(work, packed), "-C", work]);

  const pkgRoot = path.join(work, "package");
  const { version } = JSON.parse(readFileSync(path.join(pkgRoot, "package.json"), "utf8"));
  return { root: path.join(pkgRoot, "skills"), label: `hostinger-api-mcp@${version}` };
}

function skillName(skillFile) {
  const text = readFileSync(skillFile, "utf8").replace(/\r\n/g, "\n");
  const end = text.indexOf("\n---\n", 4);
  const frontmatter = text.startsWith("---\n") && end !== -1 ? text.slice(4, end) : "";
  const match = frontmatter.match(/^name:\s*["']?([a-z0-9]+(?:-[a-z0-9]+)*)["']?\s*$/m);
  if (!match) {
    throw new Error(`No valid name in the frontmatter of ${skillFile}`);
  }
  return match[1];
}

try {
  const { root, label } = resolveSkillsRoot();
  const folders = readdirSync(root)
    .filter((folder) => existsSync(path.join(root, folder, "SKILL.md")))
    .sort();
  if (folders.length === 0) {
    throw new Error(`No skills found in ${root}`);
  }

  rmSync(outDir, { recursive: true, force: true });

  const names = [];
  for (const folder of folders) {
    const from = path.join(root, folder);
    const name = skillName(path.join(from, "SKILL.md"));
    cpSync(from, path.join(outDir, name), {
      recursive: true,
      filter: (src) => path.relative(from, src).split(path.sep)[0] !== "entry",
    });
    names.push(name);
  }

  console.log(`Synced ${names.length} skills from ${label}: ${names.join(", ")}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
