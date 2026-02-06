import type { MutableRefObject } from "react";
import { useMemo, useState } from "react";
import { getKeybindings } from "../config";
import { logTrace } from "../core/logger";
import type { ParsedToken } from "../core/shells/common";
import {
	hasModifierKey,
	type KeyboardHandler,
	type KeyboardKey,
	normalizeKeyId,
} from "../utils/keyboard";
import type { ViewMode, VimMode } from "./useVimMode";

export interface UseNormalModeOptions {
	modeRef: MutableRefObject<VimMode>;
	parsedTokens: ParsedToken[];
	selectedIndex: number;
	setSelectedIndex: (index: number) => void;
	viewMode: ViewMode;
	setViewMode: (mode: ViewMode) => void;
	enterInsertMode: (
		tokenIndex: number,
		cursorPos: number,
		clearToken?: boolean,
	) => void;
	loadDescriptions: () => void;
	onSubmit?: () => void;
	skipNextInsertCharRef: MutableRefObject<boolean>;
	insertTriggerRef: MutableRefObject<string | null>;
	useKeyboard: (handler: KeyboardHandler) => void;
}

export function useNormalMode({
	modeRef,
	parsedTokens,
	selectedIndex,
	setSelectedIndex,
	viewMode,
	setViewMode,
	enterInsertMode,
	loadDescriptions,
	onSubmit,
	skipNextInsertCharRef,
	insertTriggerRef,
	useKeyboard,
}: UseNormalModeOptions): void {
	// Keybindings
	const upKeys = useMemo(() => getKeybindings("up"), []);
	const downKeys = useMemo(() => getKeybindings("down"), []);
	const leftKeys = useMemo(() => getKeybindings("left"), []);
	const rightKeys = useMemo(() => getKeybindings("right"), []);
	const wordForwardKeys = useMemo(() => getKeybindings("wordForward"), []);
	const wordBackwardKeys = useMemo(() => getKeybindings("wordBackward"), []);
	const lineStartKeys = useMemo(() => getKeybindings("lineStart"), []);
	const lineEndKeys = useMemo(() => getKeybindings("lineEnd"), []);
	const lastTokenKeys = useMemo(() => getKeybindings("lastToken"), []);
	const appendLineKeys = useMemo(() => getKeybindings("appendLine"), []);
	const toggleViewKeys = useMemo(() => getKeybindings("toggleView"), []);
	const explainKeys = useMemo(() => getKeybindings("explain"), []);
	const insertKeys = useMemo(() => getKeybindings("insert"), []);
	const appendKeys = useMemo(() => getKeybindings("append"), []);
	const changeKeys = useMemo(() => getKeybindings("change"), []);
	const saveKeys = useMemo(() => getKeybindings("save"), []);

	// Track 'g' key for "gg" command
	const [gPressed, setGPressed] = useState(false);

	useKeyboard((key: KeyboardKey) => {
		if (modeRef.current !== "normal") return;
		if (hasModifierKey(key)) return;

		const keyId = normalizeKeyId(key);
		const currentViewMode = viewMode;
		const currentSelectedIndex = selectedIndex;

		// Shared moveSelection helper (deduplicated from both branches)
		const moveSelection = (nextIndex: number) => {
			if (parsedTokens.length === 0) return;
			const boundedIndex = Math.max(
				0,
				Math.min(parsedTokens.length - 1, nextIndex),
			);
			if (boundedIndex === currentSelectedIndex) return;
			setSelectedIndex(boundedIndex);
		};

		if (saveKeys.includes(keyId)) {
			logTrace("vim:submit", {
				key: key.name,
				selectedIndex: currentSelectedIndex,
			});
			onSubmit?.();
			return;
		}

		if (toggleViewKeys.includes(keyId)) {
			const nextMode = currentViewMode === "list" ? "annotated" : "list";
			logTrace("vim:toggleView", {
				from: currentViewMode,
				to: nextMode,
			});
			setViewMode(nextMode);
			return;
		}

		if (explainKeys.includes(keyId)) {
			logTrace("vim:loadDescriptions", {});
			loadDescriptions();
			return;
		}

		if (currentViewMode === "annotated" && appendLineKeys.includes(keyId)) {
			const lastIndex = parsedTokens.length - 1;
			if (lastIndex < 0) return;
			logTrace("vim:appendLine", {
				targetIndex: lastIndex,
			});
			setSelectedIndex(lastIndex);
			const tokenValue = parsedTokens[lastIndex]?.value ?? "";
			enterInsertMode(lastIndex, tokenValue.length, false);
			return;
		}

		if (insertKeys.includes(keyId)) {
			logTrace("vim:commandInsert", {
				targetIndex: currentSelectedIndex,
			});
			skipNextInsertCharRef.current = true;
			insertTriggerRef.current = key.sequence ?? key.name;
			enterInsertMode(currentSelectedIndex, 0, false);
			return;
		}

		if (appendKeys.includes(keyId)) {
			logTrace("vim:commandAppend", {
				targetIndex: currentSelectedIndex,
			});
			skipNextInsertCharRef.current = true;
			insertTriggerRef.current = key.sequence ?? key.name;
			enterInsertMode(currentSelectedIndex, 1, false);
			return;
		}

		if (changeKeys.includes(keyId)) {
			logTrace("vim:commandChange", {
				targetIndex: currentSelectedIndex,
			});
			skipNextInsertCharRef.current = true;
			insertTriggerRef.current = key.sequence ?? key.name;
			enterInsertMode(currentSelectedIndex, 0, true);
			return;
		}

		if (currentViewMode === "annotated") {
			if (leftKeys.includes(keyId)) {
				moveSelection(currentSelectedIndex - 1);
				return;
			}

			if (rightKeys.includes(keyId)) {
				moveSelection(currentSelectedIndex + 1);
				return;
			}

			if (wordBackwardKeys.includes(keyId)) {
				moveSelection(currentSelectedIndex - 1);
				return;
			}

			if (wordForwardKeys.includes(keyId)) {
				moveSelection(currentSelectedIndex + 1);
				return;
			}

			if (lineStartKeys.includes(keyId)) {
				moveSelection(0);
				return;
			}

			if (lineEndKeys.includes(keyId)) {
				if (parsedTokens.length === 0) return;
				moveSelection(parsedTokens.length - 1);
				return;
			}

			if (lastTokenKeys.includes(keyId)) {
				if (parsedTokens.length === 0) return;
				moveSelection(parsedTokens.length - 1);
				return;
			}
		} else {
			if (upKeys.includes(keyId) || keyId === "k") {
				moveSelection(currentSelectedIndex - 1);
				return;
			}

			if (downKeys.includes(keyId) || keyId === "j") {
				moveSelection(currentSelectedIndex + 1);
				return;
			}

			if (keyId === "g") {
				if (gPressed) {
					logTrace("vim:gotoFirst", { via: "gg" });
					setSelectedIndex(0);
					setGPressed(false);
				} else {
					setGPressed(true);
					setTimeout(() => setGPressed(false), 500);
				}
				return;
			}

			if (lastTokenKeys.includes(keyId)) {
				if (parsedTokens.length === 0) return;
				moveSelection(parsedTokens.length - 1);
				return;
			}
		}
	});
}
