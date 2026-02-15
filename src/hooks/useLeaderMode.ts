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
	onSuggest?: () => void;
	onGenerate?: () => void;
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
	onSuggest,
	onGenerate,
}: UseLeaderModeOptions): LeaderModeState {
	const [leaderActive, setLeaderActive] = useState(false);
	const leaderKeys = useMemo(() => getLeaderKey(), []);
	const toggleViewKeys = useMemo(() => getLeaderKeybindings("toggleView"), []);
	const explainKeys = useMemo(() => getLeaderKeybindings("explain"), []);
	const quitKeys = useMemo(() => getLeaderKeybindings("quit"), []);
	const submitKeys = useMemo(() => getLeaderKeybindings("submit"), []);
	const suggestKeys = useMemo(() => getLeaderKeybindings("suggest"), []);
	const generateKeys = useMemo(() => getLeaderKeybindings("generate"), []);

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
				if (suggestKeys.includes(keyId)) {
					logTrace("vim:suggest:enter", { via: "leader" });
					onSuggest?.();
					return true;
				}
				if (generateKeys.includes(keyId)) {
					logTrace("vim:generate:enter", { via: "leader" });
					onGenerate?.();
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
			generateKeys,
			leaderActive,
			leaderKeys,
			loadDescriptions,
			onExit,
			onGenerate,
			onSuggest,
			submitKeys,
			suggestKeys,
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
