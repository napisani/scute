#!/usr/bin/env bun

import { access, chmod, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function buildFromSource(distDir: string, binaryPath: string) {
	console.warn(
		`[scute] No prebuilt binary available for ${process.platform}/${process.arch}. Building from source...`,
	);
	await mkdir(distDir, { recursive: true });
	const build = Bun.spawn(["bun", "run", "build:bin"], {
		stdout: "inherit",
		stderr: "inherit",
	});
	const exitCode = await build.exited;
	if (exitCode !== 0) {
		build.kill();
		throw new Error("Failed to build binary from source.");
	}
	try {
		await access(binaryPath);
	} catch {
		throw new Error(
			"Build completed but the scute binary was not created at dist/scute.",
		);
	}
	await chmod(binaryPath, 0o755);
}

async function main() {
	const version = Bun.env.npm_package_version;
	if (!version || version === "0.0.0-development") {
		console.warn("[scute] Skipping postinstall: unknown package version.");
		return;
	}

	const platform = process.platform;
	if (platform !== "darwin" && platform !== "linux") {
		throw new Error(
			`Unsupported platform '${platform}'. scute distributes binaries for macOS and Linux only.`,
		);
	}

	// Ensure tar is available
	const tarCheck = Bun.spawn(["tar", "--version"], {
		stdout: "ignore",
		stderr: "ignore",
	});
	if ((await tarCheck.exited) !== 0) {
		tarCheck.kill();
		throw new Error(
			"`tar` is required to install scute. Please ensure it is available on PATH.",
		);
	}

	const archMap: Record<string, string> = {
		x64: "x86_64",
	};
	const distDir = join(import.meta.dir, "..", "dist");
	await mkdir(distDir, { recursive: true });

	const binaryPath = join(distDir, "scute");
	try {
		await access(binaryPath);
		return; // Already present (e.g. local install)
	} catch {
		// continue
	}

	const detected = archMap[process.arch] ?? null;
	if (!detected) {
		await buildFromSource(distDir, binaryPath);
		return;
	}

	const osName = platform === "darwin" ? "macos" : "linux";
	const tag = version.startsWith("v") ? version : `v${version}`;
	const tarball = `scute-${tag}-${osName}-${detected}.tar.gz`;
	const url = `https://github.com/napisani/scute/releases/download/${tag}/${tarball}`;

	console.log(`[scute] Downloading ${url}`);
	const response = await fetch(url);
	if (!response.ok) {
		if (response.status === 404) {
			await buildFromSource(distDir, binaryPath);
			return;
		}
		throw new Error(
			`[scute] Failed to download binary from ${url} (${response.status} ${response.statusText})`,
		);
	}

	const tmpFile = join(tmpdir(), `${tarball}.${process.pid}.tmp`);
	const buffer = await response.arrayBuffer();
	await Bun.write(tmpFile, buffer);

	const extract = Bun.spawn(["tar", "-xzf", tmpFile, "-C", distDir]);
	const exitCode = await extract.exited;
	if (exitCode !== 0) {
		extract.kill();
		throw new Error("[scute] Failed to extract downloaded archive.");
	}

	await chmod(binaryPath, 0o755);
	await rm(tmpFile, { force: true });
}

await main().catch((error) => {
	console.error(`[scute] Postinstall error: ${error.message}`);
	process.exit(1);
});
