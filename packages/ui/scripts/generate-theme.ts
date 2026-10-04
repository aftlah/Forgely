import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { renderThemeCss } from "../src/theme-css";

const outputPath = fileURLToPath(new URL("../src/theme.css", import.meta.url));
writeFileSync(outputPath, renderThemeCss());
process.stdout.write(`Wrote ${outputPath}\n`);
