import { useCallback, useMemo, useState } from "react";
import { getLeaderKey, getLeaderKeybindings } from "../config";
import { logTrace } from "../core/logger";
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
	onExit?: (submitted: boolean) => void;
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
	onExit,
}: UseLeaderModeOptions): LeaderModeState {
	const [leaderActive, setLeaderActive] = useState(false);
	const leaderKeys = useMemo(() => getLeaderKey(), []);
	const toggleViewKeys = useMemo(() => getLeaderKeybindings("toggleView"), []);
	const explainKeys = useMemo(() => getLeaderKeybindings("explain"), []);
	const quitKeys = useMemo(() => getLeaderKeybindings("quit"), []);
	const submitKeys = useMemo(() => getLeaderKeybindings("submit"), []);

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
					onExit?.(false);
					return true;
				}
				if (submitKeys.includes(keyId)) {
					onExit?.(true);
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
			onExit,
			submitKeys,
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
