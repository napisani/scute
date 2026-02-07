#!/usr/bin/env bun

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

interface ReleaseAsset {
	id: number;
	name: string;
	browser_download_url: string;
}

interface ReleaseInfo {
	tag_name: string;
	assets: ReleaseAsset[];
}

const REPO = "napisani/scute";
const FORMULA_PATH = resolve(import.meta.dir, "..", "Formula", "scute.rb");

async function main() {
	const [, , versionArg] = process.argv;
	if (!versionArg) {
		console.error("Usage: bun scripts/update-brew.ts <version>|latest");
		process.exit(1);
	}

	const release = await fetchRelease(versionArg);
	const version = release.tag_name.replace(/^v/, "");
	const macAsset = findAsset(release.assets, "macos");
	const linuxAsset = findAsset(release.assets, "linux");

	if (!macAsset || !linuxAsset) {
		const missing = [!macAsset ? "macos" : null, !linuxAsset ? "linux" : null]
			.filter(Boolean)
			.join(", ");
		throw new Error(`Missing release assets for: ${missing}`);
	}

	console.log(`Downloading assets for ${release.tag_name}…`);
	const [macSha, linuxSha] = await Promise.all([
		computeSha256(macAsset),
		computeSha256(linuxAsset),
	]);

	await updateFormula({
		version,
		macSha,
		linuxSha,
	});
	console.log(
		`Updated Formula/scute.rb -> version ${version}, macOS sha ${macSha}, linux sha ${linuxSha}`,
	);
}

async function fetchRelease(versionArg: string): Promise<ReleaseInfo> {
	const endpoint =
		versionArg === "latest"
			? `https://api.github.com/repos/${REPO}/releases/latest`
			: `https://api.github.com/repos/${REPO}/releases/tags/${ensureTag(versionArg)}`;
	const response = await fetch(endpoint, {
		headers: {
			Accept: "application/vnd.github+json",
			"User-Agent": "scute-update-brew",
		},
	});
	if (!response.ok) {
		throw new Error(
			`Failed to fetch release info (${response.status} ${response.statusText})`,
		);
	}
	return (await response.json()) as ReleaseInfo;
}

function ensureTag(version: string): string {
	return version.startsWith("v") ? version : `v${version}`;
}

function findAsset(
	assets: ReleaseAsset[],
	platform: "macos" | "linux",
): string | null {
	const candidate = assets.find((asset) => {
		const lower = asset.name.toLowerCase();
		return lower.includes(platform) && lower.endsWith(".tar.gz");
	});
	if (!candidate) {
		return null;
	}
	return candidate.browser_download_url;
}

async function computeSha256(url: string): Promise<string> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(
			`Failed to download asset ${url} (${response.status} ${response.statusText})`,
		);
	}
	const arrayBuffer = await response.arrayBuffer();
	const hash = createHash("sha256");
	hash.update(Buffer.from(arrayBuffer));
	return hash.digest("hex");
}

async function updateFormula(params: {
	version: string;
	macSha: string;
	linuxSha: string;
}) {
	const formula = await readFile(FORMULA_PATH, "utf8");
	let updated = formula;
	updated = replaceOne(
		updated,
		/version "[^"]+"/,
		`version "${params.version}"`,
	);
	updated = replaceOne(
		updated,
		/(on_macos do\s+url "[^"]+"\s+sha256 ")[^"]+("\s+)/,
		`$1${params.macSha}$2`,
	);
	updated = replaceOne(
		updated,
		/(on_linux do\s+url "[^"]+"\s+sha256 ")[^"]+("\s+)/,
		`$1${params.linuxSha}$2`,
	);
	await writeFile(FORMULA_PATH, updated, "utf8");
}

function replaceOne(
	source: string,
	pattern: RegExp,
	replacement: string,
): string {
	if (!pattern.test(source)) {
		throw new Error(`Pattern ${pattern} not found in formula`);
	}
	return source.replace(pattern, replacement);
}

main().catch((error) => {
	console.error(`[update-brew] ${error.message}`);
	process.exit(1);
});
