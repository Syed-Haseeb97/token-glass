// Copies the native ccusage binary next to the release exe so it runs on any machine.
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "@ccusage", "ccusage-win32-x64", "bin");
const dest = join(root, "src-tauri", "target", "release");

if (!existsSync(src)) {
  console.error("ccusage binary not found. Run `npm install` first.");
  process.exit(1);
}
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log(`Copied ccusage from ${src} to ${dest}`);
