import { useCallback, useMemo, useState } from "react";
import { getLeaderKey, getLeaderKeybindings } from "../config";
import { logTrace } from "../core/logger";
import type { OutputChannel } from "../core/output";
import {
	hasModifierKey,
	type KeyboardKey,
	normalizeKeyId,
} from "../utils/keyboard";
import type { ViewMode } from "./useVimMode";

export interface UseLeaderModeOptions {
	viewMode: ViewMode;
	setViewMode: (mode: ViewMode) => void;
	loadDescriptions: () => void;
	onOutputSelected?: (channel: OutputChannel | null) => void;
}

export interface LeaderModeState {
	leaderActive: boolean;
	handleLeaderKey: (key: KeyboardKey) => boolean;
	resetLeader: () => void;
}

export function useLeaderMode({
	viewMode,
	setViewMode,
	loadDescriptions,
	onOutputSelected,
}: UseLeaderModeOptions): LeaderModeState {
	const [leaderActive, setLeaderActive] = useState(false);
	const leaderKeys = useMemo(() => getLeaderKey(), []);
	const toggleViewKeys = useMemo(() => getLeaderKeybindings("toggleView"), []);
	const explainKeys = useMemo(() => getLeaderKeybindings("explain"), []);
	const quitKeys = useMemo(() => getLeaderKeybindings("quit"), []);
	const outputClipboardKeys = useMemo(
		() => getLeaderKeybindings("outputClipboard"),
		[],
	);
	const outputReadlineKeys = useMemo(
		() => getLeaderKeybindings("outputReadline"),
		[],
	);
	const outputStdoutKeys = useMemo(
		() => getLeaderKeybindings("outputStdout"),
		[],
	);
	const outputPromptKeys = useMemo(
		() => getLeaderKeybindings("outputPrompt"),
		[],
	);

	const resetLeader = useCallback(() => {
		setLeaderActive(false);
	}, []);

	const handleLeaderKey = useCallback(
		(key: KeyboardKey) => {
			const keyId = normalizeKeyId(key);

			if (leaderActive) {
				setLeaderActive(false);
				if (keyId === "escape") {
					return true;
				}
				if (hasModifierKey(key)) {
					return true;
				}
				if (toggleViewKeys.includes(keyId)) {
					const nextMode = viewMode === "list" ? "annotated" : "list";
					logTrace("vim:toggleView", {
						from: viewMode,
						to: nextMode,
						via: "leader",
					});
					setViewMode(nextMode);
					return true;
				}
				if (explainKeys.includes(keyId)) {
					logTrace("vim:loadDescriptions", { via: "leader" });
					loadDescriptions();
					return true;
				}
				if (quitKeys.includes(keyId)) {
					onOutputSelected?.(null);
					return true;
				}
				if (outputClipboardKeys.includes(keyId)) {
					onOutputSelected?.("clipboard");
					return true;
				}
				if (outputReadlineKeys.includes(keyId)) {
					onOutputSelected?.("readline");
					return true;
				}
				if (outputStdoutKeys.includes(keyId)) {
					onOutputSelected?.("stdout");
					return true;
				}
				if (outputPromptKeys.includes(keyId)) {
					onOutputSelected?.("prompt");
					return true;
				}
				return true;
			}

			if (hasModifierKey(key)) {
				return false;
			}

			if (leaderKeys.includes(keyId)) {
				setLeaderActive(true);
				return true;
			}

			return false;
		},
		[
			explainKeys,
			leaderActive,
			leaderKeys,
			loadDescriptions,
			onOutputSelected,
			outputClipboardKeys,
			outputPromptKeys,
			outputReadlineKeys,
			outputStdoutKeys,
			quitKeys,
			setViewMode,
			toggleViewKeys,
			viewMode,
		],
	);

	return {
		leaderActive,
		handleLeaderKey,
		resetLeader,
	};
}
