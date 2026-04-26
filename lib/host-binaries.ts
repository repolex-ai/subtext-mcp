// DRAFT — to be added to subtext-mcp's server.ts startup, BEFORE main()'s mcp.connect()
//
// Layout: bin/.platforms/<target>/* are the per-platform binaries.
// On startup we symlink bin/.platforms/<host-target>/* → bin/* so that
// Claude Code's plugin bin/-PATH augmentation (top-level only — confirmed
// against docs 2026-04-26) finds them at a stable path.

import { existsSync, mkdirSync, readdirSync, symlinkSync, unlinkSync, lstatSync } from "node:fs";
import { join } from "node:path";

/**
 * Maps Node.js process.platform + process.arch to the Rust target triple
 * used by the bin/.platforms/<target>/ directory layout.
 */
function detectTargetTriple(): string | null {
  const { platform, arch } = process;
  if (platform === "darwin" && arch === "arm64") return "aarch64-apple-darwin";
  if (platform === "darwin" && arch === "x64") return "x86_64-apple-darwin";
  if (platform === "linux" && arch === "x64") return "x86_64-unknown-linux-gnu";
  if (platform === "linux" && arch === "arm64") return "aarch64-unknown-linux-gnu";
  return null;
}

/**
 * On startup: symlink bin/.platforms/<host-target>/* up into bin/* so the
 * plugin's top-level bin/ PATH entry exposes the right binaries.
 *
 * Idempotent — replaces stale symlinks. Silent on missing platform support
 * (logs a warning to stderr, does not crash the MCP server).
 */
export function setupHostBinaries(pluginRoot: string): void {
  const target = detectTargetTriple();
  if (!target) {
    console.error(
      `[subtext] Unsupported platform: ${process.platform}/${process.arch} — git-lex binaries unavailable`
    );
    return;
  }

  const platformBinDir = join(pluginRoot, "bin", ".platforms", target);
  if (!existsSync(platformBinDir)) {
    console.error(
      `[subtext] No binaries shipped for ${target} (looked in ${platformBinDir})`
    );
    return;
  }

  const topBinDir = join(pluginRoot, "bin");
  mkdirSync(topBinDir, { recursive: true });

  for (const entry of readdirSync(platformBinDir)) {
    const src = join(platformBinDir, entry);
    const dst = join(topBinDir, entry);
    // Replace any stale symlink/file at the top level
    if (lstatExists(dst)) {
      try {
        unlinkSync(dst);
      } catch {
        // ignore — will fail loudly on symlinkSync below if it's a real problem
      }
    }
    try {
      symlinkSync(src, dst);
    } catch (e) {
      console.error(`[subtext] Failed to symlink ${entry}: ${(e as Error).message}`);
    }
  }
  console.error(`[subtext] Activated git-lex binaries for ${target}`);
}

function lstatExists(p: string): boolean {
  try {
    lstatSync(p);
    return true;
  } catch {
    return false;
  }
}

// Wiring in main():
//   import { fileURLToPath } from "node:url";
//   import { dirname } from "node:path";
//   const pluginRoot = dirname(fileURLToPath(import.meta.url));
//   setupHostBinaries(pluginRoot);
