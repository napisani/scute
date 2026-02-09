import type { MutableRefObject } from "react";
import { useMemo, useState } from "react";
import { getNormalKeybindings } from "../config";
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
	handleLeaderKey: (key: KeyboardKey) => boolean;
	enterInsertMode: (
		tokenIndex: number,
		cursorPos: number,
		clearToken?: boolean,
	) => void;
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
	handleLeaderKey,
	enterInsertMode,
	onSubmit,
	skipNextInsertCharRef,
	insertTriggerRef,
	useKeyboard,
}: UseNormalModeOptions): void {
	// Keybindings
	const upKeys = useMemo(() => getNormalKeybindings("up"), []);
	const downKeys = useMemo(() => getNormalKeybindings("down"), []);
	const leftKeys = useMemo(() => getNormalKeybindings("left"), []);
	const rightKeys = useMemo(() => getNormalKeybindings("right"), []);
	const wordForwardKeys = useMemo(
		() => getNormalKeybindings("wordForward"),
		[],
	);
	const wordBackwardKeys = useMemo(
		() => getNormalKeybindings("wordBackward"),
		[],
	);
	const lineStartKeys = useMemo(() => getNormalKeybindings("lineStart"), []);
	const lineEndKeys = useMemo(() => getNormalKeybindings("lineEnd"), []);
	const lastTokenKeys = useMemo(() => getNormalKeybindings("lastToken"), []);
	const appendLineKeys = useMemo(() => getNormalKeybindings("appendLine"), []);
	const insertKeys = useMemo(() => getNormalKeybindings("insert"), []);
	const appendKeys = useMemo(() => getNormalKeybindings("append"), []);
	const changeKeys = useMemo(() => getNormalKeybindings("change"), []);
	const saveKeys = useMemo(() => getNormalKeybindings("save"), []);

	// Track 'g' key for "gg" command
	const [gPressed, setGPressed] = useState(false);

	useKeyboard((key: KeyboardKey) => {
		if (modeRef.current !== "normal") return;

		const keyId = normalizeKeyId(key);
		const currentSelectedIndex = selectedIndex;

		if (handleLeaderKey(key)) {
			return;
		}

		if (hasModifierKey(key)) return;

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

		if (viewMode === "annotated" && appendLineKeys.includes(keyId)) {
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

		if (viewMode === "annotated") {
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
