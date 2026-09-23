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
	handleLeaderKey: (key: KeyboardKey) => boolean;
	enterInsertMode: (tokenIndex: number, initialValue: string) => void;
	onTokenDelete: (options: {
		tokenIndex: number;
		deleteToEnd: boolean;
		nextSelectedIndex: number;
	}) => void;
	onSubmit?: () => void;
	useKeyboard: (handler: KeyboardHandler) => void;
}

type NormalKeyBindings = {
	upKeys: string[];
	downKeys: string[];
	leftKeys: string[];
	rightKeys: string[];
	wordForwardKeys: string[];
	wordBackwardKeys: string[];
	lineStartKeys: string[];
	lineEndKeys: string[];
	lastTokenKeys: string[];
	appendLineKeys: string[];
	insertKeys: string[];
	appendKeys: string[];
	changeKeys: string[];
	deleteKeys: string[];
	deleteLineKeys: string[];
	saveKeys: string[];
};

type SelectionMover = (nextIndex: number) => void;

interface KeyHandlerContext {
	key: KeyboardKey;
	keyId: string;
	parsedTokens: ParsedToken[];
	selectedIndex: number;
	viewMode: ViewMode;
	keys: NormalKeyBindings;
	moveSelection: SelectionMover;
	setSelectedIndex: (index: number) => void;
	setGPressed: (pressed: boolean) => void;
	gPressed: boolean;
	enterInsertMode: (tokenIndex: number, initialValue: string) => void;
	onTokenDelete: UseNormalModeOptions["onTokenDelete"];
	onSubmit?: () => void;
}

function handleEditingCommand(context: KeyHandlerContext): boolean {
	const { key, keyId, parsedTokens, selectedIndex, viewMode, keys } = context;
	if (keys.saveKeys.includes(keyId)) {
		logTrace("vim:submit", { key: key.name, selectedIndex });
		context.onSubmit?.();
		return true;
	}
	if (viewMode === "annotated" && keys.appendLineKeys.includes(keyId)) {
		const lastIndex = parsedTokens.length - 1;
		if (lastIndex < 0) {return true;}
		logTrace("vim:appendLine", { targetIndex: lastIndex });
		context.setSelectedIndex(lastIndex);
		const tokenValue = parsedTokens[lastIndex]?.value ?? "";
		context.enterInsertMode(lastIndex, tokenValue);
		return true;
	}
	if (keys.insertKeys.includes(keyId)) {
		logTrace("vim:commandInsert", { targetIndex: selectedIndex });
		const tokenValue = parsedTokens[selectedIndex]?.value ?? "";
		context.enterInsertMode(selectedIndex, tokenValue);
		return true;
	}
	if (keys.appendKeys.includes(keyId)) {
		logTrace("vim:commandAppend", { targetIndex: selectedIndex });
		const tokenValue = parsedTokens[selectedIndex]?.value ?? "";
		context.enterInsertMode(selectedIndex, tokenValue);
		return true;
	}
	if (keys.changeKeys.includes(keyId)) {
		logTrace("vim:commandChange", { targetIndex: selectedIndex });
		context.enterInsertMode(selectedIndex, "");
		return true;
	}
	if (keys.deleteKeys.includes(keyId) || keys.deleteLineKeys.includes(keyId)) {
		const deleteToEnd = keys.deleteLineKeys.includes(keyId);
		logTrace(`vim:commandDelete${deleteToEnd ? "Line" : ""}`, {
			targetIndex: selectedIndex,
		});
		const nextSelectedIndex = Math.max(0, selectedIndex - 1);
		context.setSelectedIndex(nextSelectedIndex);
		context.onTokenDelete({
			tokenIndex: selectedIndex,
			deleteToEnd,
			nextSelectedIndex,
		});
		return true;
	}
	return false;
}

function handleAnnotatedNavigation(context: KeyHandlerContext): boolean {
	const { keyId, parsedTokens, moveSelection, selectedIndex, keys } = context;
	const navigation = [
		[keys.leftKeys, selectedIndex - 1],
		[keys.rightKeys, selectedIndex + 1],
		[keys.wordBackwardKeys, selectedIndex - 1],
		[keys.wordForwardKeys, selectedIndex + 1],
	] as const;
	for (const [binding, nextIndex] of navigation) {
		if (binding.includes(keyId)) {
			moveSelection(nextIndex);
			return true;
		}
	}
	if (keys.lineStartKeys.includes(keyId)) {
		moveSelection(0);
		return true;
	}
	if (keys.lineEndKeys.includes(keyId) || keys.lastTokenKeys.includes(keyId)) {
		if (parsedTokens.length === 0) {return true;}
		moveSelection(parsedTokens.length - 1);
		return true;
	}
	return false;
}

function handleListNavigation(context: KeyHandlerContext): boolean {
	const { keyId, parsedTokens, moveSelection, selectedIndex, keys } = context;
	if (keys.upKeys.includes(keyId) || keyId === "k") {
		moveSelection(selectedIndex - 1);
		return true;
	}
	if (keys.downKeys.includes(keyId) || keyId === "j") {
		moveSelection(selectedIndex + 1);
		return true;
	}
	if (keyId === "g") {
		if (context.gPressed) {
			logTrace("vim:gotoFirst", { via: "gg" });
			context.setSelectedIndex(0);
			context.setGPressed(false);
		} else {
			context.setGPressed(true);
			setTimeout(() => context.setGPressed(false), 500);
		}
		return true;
	}
	if (keys.lastTokenKeys.includes(keyId)) {
		if (parsedTokens.length === 0) {return true;}
		moveSelection(parsedTokens.length - 1);
		return true;
	}
	return false;
}

export function useNormalMode({
	modeRef,
	parsedTokens,
	selectedIndex,
	setSelectedIndex,
	viewMode,
	handleLeaderKey,
	enterInsertMode,
	onTokenDelete,
	onSubmit,
	useKeyboard,
}: UseNormalModeOptions): void {
	const keyBindings: NormalKeyBindings = {
		upKeys: useMemo(() => getNormalKeybindings("up"), []),
		downKeys: useMemo(() => getNormalKeybindings("down"), []),
		leftKeys: useMemo(() => getNormalKeybindings("left"), []),
		rightKeys: useMemo(() => getNormalKeybindings("right"), []),
		wordForwardKeys: useMemo(() => getNormalKeybindings("wordForward"), []),
		wordBackwardKeys: useMemo(() => getNormalKeybindings("wordBackward"), []),
		lineStartKeys: useMemo(() => getNormalKeybindings("lineStart"), []),
		lineEndKeys: useMemo(() => getNormalKeybindings("lineEnd"), []),
		lastTokenKeys: useMemo(() => getNormalKeybindings("lastToken"), []),
		appendLineKeys: useMemo(() => getNormalKeybindings("appendLine"), []),
		insertKeys: useMemo(() => getNormalKeybindings("insert"), []),
		appendKeys: useMemo(() => getNormalKeybindings("append"), []),
		changeKeys: useMemo(() => getNormalKeybindings("change"), []),
		deleteKeys: useMemo(() => getNormalKeybindings("delete"), []),
		deleteLineKeys: useMemo(() => getNormalKeybindings("deleteLine"), []),
		saveKeys: useMemo(() => getNormalKeybindings("save"), []),
	};
	const [gPressed, setGPressed] = useState(false);

	useKeyboard((key: KeyboardKey) => {
		if (modeRef.current !== "normal") {return;}
		const keyId = normalizeKeyId(key);
		if (handleLeaderKey(key) || hasModifierKey(key)) {return;}
		const currentSelectedIndex = selectedIndex;
		const moveSelection: SelectionMover = (nextIndex) => {
			if (parsedTokens.length === 0) {return;}
			const boundedIndex = Math.max(
				0,
				Math.min(parsedTokens.length - 1, nextIndex),
			);
			if (boundedIndex === currentSelectedIndex) {return;}
			setSelectedIndex(boundedIndex);
		};
		const context: KeyHandlerContext = {
			key,
			keyId,
			parsedTokens,
			selectedIndex: currentSelectedIndex,
			viewMode,
			keys: keyBindings,
			moveSelection,
			setSelectedIndex,
			setGPressed,
			gPressed,
			enterInsertMode,
			onTokenDelete,
			onSubmit,
		};
		if (handleEditingCommand(context)) {return;}
		if (viewMode === "annotated") {
			handleAnnotatedNavigation(context);
		} else {
			handleListNavigation(context);
		}
	});
}
