import { spawnSync } from "node:child_process";
import { type ActionChoice, CHOICES } from "./types";

/**
 * Run an external fuzzy-finder command (e.g. fzf) as the chooser.
 *
 * Pipes choice labels to the command's stdin, reads the selected line
 * from stdout, and maps it back to an ActionChoice.
 *
 * stderr is inherited so the fuzzy finder can render its UI to the
 * terminal (since stdout is captured by the shell's $()).
 *
 * Returns the selected action, or null if the user cancelled or the
 * command failed.
 */
export function runExternalChooser(command: string): ActionChoice | null {
	const input = CHOICES.map((c) => c.label).join("\n") + "\n";

	let result: ReturnType<typeof spawnSync>;
	try {
		result = spawnSync(command, {
			input,
			stdio: ["pipe", "pipe", "inherit"],
			shell: true,
			encoding: "utf8",
		});
	} catch {
		// Command not found or spawn failure — fall back
		process.stderr.write(`scute: chooserCommand failed to spawn: ${command}\n`);
		return null;
	}

	// User cancelled (e.g. Ctrl-C in fzf exits with 130)
	if (result.status !== 0) {
		return null;
	}

	const selected = String(result.stdout ?? "").trim();
	if (!selected) {
		return null;
	}

	// Map the selected label back to an action
	const match = CHOICES.find((c) => c.label === selected);
	return match?.action ?? null;
}
