import { cpSync, mkdirSync, rmSync } from "node:fs";

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });
for (const entry of ["index.html", "styles.css", "src"]) {
  cpSync(entry, `dist/${entry}`, { recursive: true });
}
process.stdout.write("Built static site in dist/.\n");
