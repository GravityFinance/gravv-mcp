/**
 * The package version, read from package.json rather than hardcoded. A literal had
 * already drifted once — the server reported 0.1.0 while the package was 0.2.0, so
 * clients were told the wrong version. It names the server to MCP clients and to the
 * Gravv API (User-Agent).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

function packageVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    for (const rel of ["../package.json", "../../package.json"]) {
      try {
        return JSON.parse(readFileSync(join(here, rel), "utf8")).version;
      } catch {
        /* try the next candidate */
      }
    }
  } catch {
    /* fall through */
  }
  return "0.0.0";
}

export const VERSION = packageVersion();
