import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";

const pkgPath = path.resolve(process.cwd(), "package.json");
const pkg = JSON.parse(await Bun.file(pkgPath).text()) as { version: string };
const version = pkg.version;

const generatedPath = path.resolve(process.cwd(), "src/version.generated.ts");

writeFileSync(
	generatedPath,
	`export const SCUTE_VERSION = ${JSON.stringify(version)};\n`,
);

const command = "bun build ./src/index.ts --compile --outfile dist/scute";

execSync(command, { stdio: "inherit" });
