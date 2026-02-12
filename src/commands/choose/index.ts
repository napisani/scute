import { getConfigSnapshot } from "../../config";
import { dispatch } from "./dispatch";
import { runExternalChooser } from "./external";
import { runBuiltinMenu } from "./menu";

export async function choose(
	lineArg: string | undefined,
	pointArg: string | undefined,
): Promise<void> {
	const originalLine = lineArg ?? "";
	const parsedPoint = pointArg ? Number(pointArg) : undefined;
	const originalPoint = Number.isFinite(parsedPoint)
		? Math.max(0, parsedPoint as number)
		: originalLine.length;

	const config = getConfigSnapshot();

	let action = null;

	if (config.chooserCommand) {
		// Try external fuzzy finder first; fall back to built-in on failure
		action = runExternalChooser(config.chooserCommand);
		if (action === null && !isUserCancel(config.chooserCommand)) {
			action = await runBuiltinMenu();
		}
	} else {
		action = await runBuiltinMenu();
	}

	if (action === null) {
		// User cancelled — output original line to preserve BUFFER
		process.stdout.write(originalLine);
		return;
	}

	await dispatch(action, originalLine, originalPoint);
}

/**
 * Heuristic: if the external chooser returns null we can't distinguish
 * between "user cancelled" and "command failed" reliably since both
 * produce non-zero exit codes. We always treat null as cancel for now
 * and let the error message in runExternalChooser handle the spawn
 * failure case (which prints to stderr before returning null).
 *
 * This function exists as a hook for future refinement.
 */
function isUserCancel(_command: string): boolean {
	return true;
}
