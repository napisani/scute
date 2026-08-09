import { createRequire } from "node:module";
import { SCUTE_VERSION as GENERATED_VERSION } from "./version.generated";

let resolvedVersion = GENERATED_VERSION;

if (resolvedVersion === "__SCUTE_VERSION__") {
	try {
		const require = createRequire(import.meta.url);
		const pkg = require("../package.json") as { version?: string };
		if (pkg?.version) {
			resolvedVersion = pkg.version;
		}
	} catch {
		// Ignore missing package.json in compiled binaries.
	}
}

export const SCUTE_VERSION = resolvedVersion;
