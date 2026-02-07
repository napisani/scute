#!/usr/bin/env node

import { execFile as execFileCb, spawn } from "node:child_process";
import { access, chmod, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFile = promisify(execFileCb);

async function main() {
	const version = process.env.npm_package_version;
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

	await ensureTar();

	const archMap = {
		x64: "x86_64",
		arm64: "arm64",
	};
	const detectedArch = archMap[process.arch];

	const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
	const distDir = join(rootDir, "dist");
	await mkdir(distDir, { recursive: true });
	const binaryPath = join(distDir, "scute");

	if (await fileExists(binaryPath)) {
		return;
	}

	if (!detectedArch) {
		await buildFromSource(rootDir, distDir, binaryPath);
		return;
	}

	const osName = platform === "darwin" ? "macos" : "linux";
	const tag = version.startsWith("v") ? version : `v${version}`;
	const tarball = `scute-${tag}-${osName}-${detectedArch}.tar.gz`;
	const url = `https://github.com/napisani/scute/releases/download/${tag}/${tarball}`;

	try {
		await downloadAndExtract(url, distDir, binaryPath);
	} catch (error) {
		if (error instanceof HttpError && error.status === 404) {
			await buildFromSource(rootDir, distDir, binaryPath);
			return;
		}
		throw error;
	}
}

async function ensureTar() {
	try {
		await execFile("tar", ["--version"]);
	} catch {
		throw new Error(
			"`tar` is required to install scute. Please ensure it is available on PATH.",
		);
	}
}

async function fileExists(path) {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

async function downloadAndExtract(url, distDir, binaryPath) {
	console.log(`[scute] Downloading ${url}`);
	const response = await fetch(url);
	if (!response.ok) {
		throw new HttpError(response.status, response.statusText);
	}
	const buffer = Buffer.from(await response.arrayBuffer());
	const tmpFile = join(tmpdir(), `scute-${process.pid}-${Date.now()}.tar.gz`);
	try {
		await writeFile(tmpFile, buffer);
		await execFile("tar", ["-xzf", tmpFile, "-C", distDir]);
		await chmod(binaryPath, 0o755);
	} finally {
		await rm(tmpFile, { force: true });
	}
}

async function buildFromSource(rootDir, distDir, binaryPath) {
	console.warn(
		`[scute] No prebuilt binary available for ${process.platform}/${process.arch}. Attempting local build...`,
	);
	const bunExecutable = await resolveCommand("bun");
	if (!bunExecutable) {
		throw new Error(
			"Bun is required to build scute from source but was not found on PATH. Install Bun (https://bun.sh) or install a supported prebuilt binary.",
		);
	}
	await execWithInheritedStdIO(
		bunExecutable,
		["install", "--frozen-lockfile"],
		{
			cwd: rootDir,
		},
	);
	await execWithInheritedStdIO(bunExecutable, ["run", "build:bin"], {
		cwd: rootDir,
	});
	if (!(await fileExists(binaryPath))) {
		throw new Error(
			"Build completed but the scute binary was not created at dist/scute.",
		);
	}
	await chmod(binaryPath, 0o755);
}

async function resolveCommand(command) {
	try {
		const { stdout } = await execFile("which", [command]);
		const path = stdout.trim();
		return path.length ? path : null;
	} catch {
		return null;
	}
}

async function execWithInheritedStdIO(command, args, options) {
	await new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			stdio: "inherit",
			...options,
		});
		child.on("error", reject);
		child.on("exit", (code) => {
			if (code === 0) {
				resolve();
			} else {
				reject(
					new Error(`${command} ${args.join(" ")} exited with code ${code}`),
				);
			}
		});
	});
}

class HttpError extends Error {
	constructor(status, statusText) {
		super(`[scute] Failed to download binary (${status} ${statusText})`);
		this.status = status;
	}
}

main().catch((error) => {
	console.error(`[scute] Postinstall error: ${error.message}`);
	process.exit(1);
});
