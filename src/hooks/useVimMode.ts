import { useKeyboard as useOpenTuiKeyboard } from "@opentui/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getInitialViewMode } from "../config";
import { logTrace } from "../core/logger";
import type { ParsedToken } from "../core/shells/common";
import type { KeyboardHandler, KeyboardKey } from "../utils/keyboard";
import { useLeaderMode } from "./useLeaderMode";
import { useNormalMode } from "./useNormalMode";

export type ViewMode = "list" | "annotated";

export type VimMode = "normal" | "insert" | "suggest" | "generate";

export type { KeyboardHandler, KeyboardKey };

export interface VimModeState {
	mode: VimMode;
	selectedIndex: number;
	viewMode: ViewMode;
	leaderActive: boolean;
	editingTokenIndex: number | null;
	editingValue: string;
	suggestValue: string;
	generateValue: string;
}

export interface VimModeActions {
	enterInsertMode: (tokenIndex: number, initialValue: string) => void;
	exitInsertMode: (save: boolean) => void;
	updateEditingValue: (value: string) => void;
	setSelectedIndex: (index: number) => void;
	setViewMode: (mode: ViewMode) => void;
	loadDescriptions: () => void;
	updateSuggestValue: (value: string) => void;
	updateGenerateValue: (value: string) => void;
}

export interface UseVimModeOptions {
	parsedTokens: ParsedToken[];
	loadDescriptions: () => void;
	onTokenEdit?: (tokenIndex: number, newValue: string) => void;
	onSubmit?: () => void;
	onExit?: (submitted: boolean) => void;
	onSuggestSubmit?: (prompt: string) => void;
	onGenerateSubmit?: (prompt: string) => void;
	useKeyboard?: (handler: KeyboardHandler) => void;
}

// Hook interface that accepts optional keyboard hook for testing
export function useVimMode({
	parsedTokens,
	loadDescriptions,
	onTokenEdit,
	onSubmit,
	onExit,
	onSuggestSubmit,
	onGenerateSubmit,
	useKeyboard = useOpenTuiKeyboard,
}: UseVimModeOptions): VimModeState & VimModeActions {
	// Shared state
	const [mode, setMode] = useState<VimMode>("normal");
	const modeRef = useRef(mode);
	modeRef.current = mode;
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode);

	// Insert state — value owned by <input>, we just track it for save/cancel
	const [editingTokenIndex, setEditingTokenIndex] = useState<number | null>(
		null,
	);
	const [editingValue, setEditingValue] = useState("");

	// Suggest state — value owned by <input>
	const [suggestValue, setSuggestValue] = useState("");

	// Generate state — value owned by <input>
	const [generateValue, setGenerateValue] = useState("");

	// Refs to hold current values so useKeyboard closures always read latest state
	const editingTokenIndexRef = useRef(editingTokenIndex);
	editingTokenIndexRef.current = editingTokenIndex;
	const editingValueRef = useRef(editingValue);
	editingValueRef.current = editingValue;
	const suggestValueRef = useRef(suggestValue);
	suggestValueRef.current = suggestValue;
	const generateValueRef = useRef(generateValue);
	generateValueRef.current = generateValue;
	const onTokenEditRef = useRef(onTokenEdit);
	onTokenEditRef.current = onTokenEdit;
	const onSuggestSubmitRef = useRef(onSuggestSubmit);
	onSuggestSubmitRef.current = onSuggestSubmit;
	const onGenerateSubmitRef = useRef(onGenerateSubmit);
	onGenerateSubmitRef.current = onGenerateSubmit;

	const enterSuggestMode = useCallback(() => {
		logTrace("vim:enterSuggest", {});
		setSuggestValue("");
		setMode("suggest");
	}, []);

	const exitSuggestMode = useCallback(() => {
		const prompt = suggestValueRef.current.trim();
		if (prompt.length > 0) {
			logTrace("vim:suggest:submit", { promptLength: prompt.length });
			onSuggestSubmitRef.current?.(prompt);
		}
		setSuggestValue("");
		setMode("normal");
	}, []);

	const cancelSuggestMode = useCallback(() => {
		setSuggestValue("");
		setMode("normal");
	}, []);

	const enterGenerateMode = useCallback(() => {
		logTrace("vim:enterGenerate", {});
		setGenerateValue("");
		setMode("generate");
	}, []);

	const exitGenerateMode = useCallback(() => {
		const prompt = generateValueRef.current.trim();
		if (prompt.length > 0) {
			logTrace("vim:generate:submit", { promptLength: prompt.length });
			onGenerateSubmitRef.current?.(prompt);
		}
		setGenerateValue("");
		setMode("normal");
	}, []);

	const cancelGenerateMode = useCallback(() => {
		setGenerateValue("");
		setMode("normal");
	}, []);

	const { leaderActive, handleLeaderKey, resetLeader } = useLeaderMode({
		viewMode,
		setViewMode,
		loadDescriptions,
		onExit,
		onSuggest: enterSuggestMode,
		onGenerate: enterGenerateMode,
	});

	// Reset state when tokens change
	const parsedTokensKey = useMemo(
		() => JSON.stringify(parsedTokens.map((token) => token.value)),
		[parsedTokens],
	);

	useEffect(() => {
		void parsedTokensKey;
		logTrace("vim:resetTokens", {
			tokenCount: parsedTokens.length,
		});
		setMode("normal");
		setSelectedIndex(0);
		setEditingTokenIndex(null);
		setEditingValue("");
		setSuggestValue("");
		setGenerateValue("");
		resetLeader();
	}, [parsedTokensKey, parsedTokens.length, resetLeader]);

	// Shared actions
	const enterInsertMode = useCallback(
		(tokenIndex: number, initialValue: string) => {
			logTrace("vim:enterInsert", {
				tokenIndex,
				initialValueLength: initialValue.length,
			});
			setEditingTokenIndex(tokenIndex);
			setEditingValue(initialValue);
			setMode("insert");
		},
		[],
	);

	const saveInsertMode = useCallback(() => {
		const tokenIndex = editingTokenIndexRef.current;
		const value = editingValueRef.current;
		logTrace("vim:exitInsert", {
			save: true,
			editingTokenIndex: tokenIndex,
			valueLength: value.length,
		});
		if (tokenIndex !== null && value.length > 0) {
			onTokenEditRef.current?.(tokenIndex, value);
		}
		setEditingTokenIndex(null);
		setEditingValue("");
		setMode("normal");
	}, []);

	const cancelInsertMode = useCallback(() => {
		logTrace("vim:exitInsert", {
			save: false,
			editingTokenIndex: editingTokenIndexRef.current,
			valueLength: editingValueRef.current.length,
		});
		setEditingTokenIndex(null);
		setEditingValue("");
		setMode("normal");
	}, []);

	// exitInsertMode is the public API that delegates to save/cancel
	const exitInsertMode = useCallback(
		(save: boolean) => {
			if (save) {
				saveInsertMode();
			} else {
				cancelInsertMode();
			}
		},
		[saveInsertMode, cancelInsertMode],
	);

	const updateEditingValue = useCallback(
		(value: string) => {
			const preview = value.length > 32 ? `${value.slice(0, 32)}…` : value;
			logTrace("vim:updateEditingValue", {
				tokenIndex: editingTokenIndex,
				valueLength: value.length,
				preview,
			});
			setEditingValue(value);
		},
		[editingTokenIndex],
	);

	const updateSuggestValue = useCallback((value: string) => {
		setSuggestValue(value);
	}, []);

	const updateGenerateValue = useCallback((value: string) => {
		setGenerateValue(value);
	}, []);

	// Single useKeyboard handler for insert/suggest/generate mode interception
	// This fires BEFORE the focused <input>, so preventDefault() blocks
	// the <input> from seeing Escape/Enter.
	// Uses refs to avoid stale closure issues — the handler is registered once
	// but always reads the latest state via refs.
	useKeyboard((key: KeyboardKey) => {
		const currentMode = modeRef.current;
		if (currentMode === "insert") {
			if (key.name === "escape") {
				key.preventDefault?.();
				cancelInsertMode();
				return;
			}
			if (key.name === "return" || key.sequence === "\r") {
				key.preventDefault?.();
				saveInsertMode();
				return;
			}
		}
		if (currentMode === "suggest") {
			if (key.name === "escape") {
				key.preventDefault?.();
				cancelSuggestMode();
				return;
			}
			if (key.name === "return" || key.sequence === "\r") {
				key.preventDefault?.();
				exitSuggestMode();
				return;
			}
		}
		if (currentMode === "generate") {
			if (key.name === "escape") {
				key.preventDefault?.();
				cancelGenerateMode();
				return;
			}
			if (key.name === "return" || key.sequence === "\r") {
				key.preventDefault?.();
				exitGenerateMode();
				return;
			}
		}
	});

	// Compose normal mode (the only remaining sub-hook)
	useNormalMode({
		modeRef,
		parsedTokens,
		selectedIndex,
		setSelectedIndex,
		viewMode,
		setViewMode,
		handleLeaderKey,
		enterInsertMode,
		onSubmit,
		useKeyboard,
	});

	return {
		// State
		mode,
		selectedIndex,
		viewMode,
		leaderActive,
		editingTokenIndex,
		editingValue,
		suggestValue,
		generateValue,
		// Actions
		enterInsertMode,
		exitInsertMode,
		updateEditingValue,
		updateSuggestValue,
		updateGenerateValue,
		setSelectedIndex,
		setViewMode,
		loadDescriptions,
	};
}
