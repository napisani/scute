import { useKeyboard } from "@opentui/react";
import { useCallback, useMemo, useState } from "react";
import { getConfigSnapshot, getKeybindings } from "../config";
import type { ViewMode } from "./useViewMode";

export interface NormalModeActions {
	enterInsertMode: (
		tokenIndex: number,
		cursorPos: number,
		clearToken?: boolean,
	) => void;
	loadDescriptions: () => void;
}

export function useNormalMode(tokenCount: number, actions: NormalModeActions) {
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [viewMode, setViewMode] = useState<ViewMode>(() =>
		getConfigSnapshot().viewMode === "horizontal" ? "annotated" : "list",
	);

	const upKeys = useMemo(() => getKeybindings("up"), []);
	const downKeys = useMemo(() => getKeybindings("down"), []);
	const toggleViewKeys = useMemo(
		() => getKeybindings("toggleView") ?? ["v"],
		[],
	);
	const explainKeys = useMemo(() => getKeybindings("explain"), []);
	const insertKeys = useMemo(() => getKeybindings("insert") ?? ["i"], []);
	const appendKeys = useMemo(() => getKeybindings("append") ?? ["a"], []);
	const changeKeys = useMemo(() => getKeybindings("change") ?? ["c"], []);

	useKeyboard((key) => {
		// Navigation
		if (upKeys.includes(key.name)) {
			setSelectedIndex((index) => Math.max(0, index - 1));
			return;
		}
		if (downKeys.includes(key.name)) {
			setSelectedIndex((index) => Math.min(tokenCount - 1, index + 1));
			return;
		}

		// View toggle
		if (toggleViewKeys.includes(key.name)) {
			setViewMode((mode) => (mode === "list" ? "annotated" : "list"));
			return;
		}

		// Explain
		if (explainKeys.includes(key.name)) {
			actions.loadDescriptions();
			return;
		}

		// Edit commands
		if (insertKeys.includes(key.name)) {
			actions.enterInsertMode(selectedIndex, 0, false);
			return;
		}
		if (appendKeys.includes(key.name)) {
			actions.enterInsertMode(selectedIndex, 1, false);
			return;
		}
		if (changeKeys.includes(key.name)) {
			actions.enterInsertMode(selectedIndex, 0, true);
			return;
		}
	});

	return {
		selectedIndex,
		setSelectedIndex,
		viewMode,
		setViewMode,
	};
}
