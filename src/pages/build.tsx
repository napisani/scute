import { useKeyboard } from "@opentui/react";
import { useCallback, useMemo, useState } from "react";
import { Footer } from "../components/Footer";
import { TokenAnnotatedView } from "../components/TokenAnnotatedView";
import { TokenListView } from "../components/TokenListView";

import {
	buildParsedCommand,
	parseTokens,
	rebuildParsedCommandFromTokens,
	tokenizeInput,
} from "../core/shells";
import type { ParsedCommand } from "../core/shells/common";
import { useColoredTokens } from "../hooks/useColoredTokens";
import { useParsedCommand } from "../hooks/useParsedCommand";
import { useTokenDescriptions } from "../hooks/useTokenDescriptions";
import { useTokenWidth } from "../hooks/useTokenWidth";
import { useVimMode } from "../hooks/useVimMode";
import {
	hasModifierKey,
	type KeyboardKey,
	normalizeKeyId,
} from "../utils/keyboard";
import { calculateTokenPositions } from "../utils/tokenPositions";

type BuildAppProps = {
	command: string;
	onExit?: (nextCommand: string, submitted: boolean) => void;
};

export interface ApplyTokenEditResult {
	command: ParsedCommand;
	startIndex: number;
	removedCount: number;
	insertedCount: number;
}

export interface EmptyDraftState {
	value: string;
	cursor: number;
}

export interface EmptyDraftResult {
	state: EmptyDraftState;
	submittedValue: string | null;
}

export const emptyDraftInitialState: EmptyDraftState = {
	value: "",
	cursor: 0,
};

export function processEmptyDraftKey(
	state: EmptyDraftState,
	key: KeyboardKey,
): EmptyDraftResult {
	if (hasModifierKey(key)) {
		return { state, submittedValue: null };
	}

	const keyId = normalizeKeyId(key);

	if (keyId === "return") {
		const candidate = state.value;
		if (candidate.trim().length === 0) {
			return { state, submittedValue: null };
		}
		return { state, submittedValue: candidate };
	}

	if (key.name === "backspace") {
		if (state.cursor <= 0) {
			return { state, submittedValue: null };
		}
		const nextValue =
			state.value.slice(0, state.cursor - 1) + state.value.slice(state.cursor);
		return {
			state: {
				value: nextValue,
				cursor: state.cursor - 1,
			},
			submittedValue: null,
		};
	}

	if (key.name === "delete") {
		if (state.cursor >= state.value.length) {
			return { state, submittedValue: null };
		}
		return {
			state: {
				value:
					state.value.slice(0, state.cursor) +
					state.value.slice(state.cursor + 1),
				cursor: state.cursor,
			},
			submittedValue: null,
		};
	}

	if (key.name === "left") {
		return {
			state: {
				value: state.value,
				cursor: Math.max(0, state.cursor - 1),
			},
			submittedValue: null,
		};
	}

	if (key.name === "right") {
		return {
			state: {
				value: state.value,
				cursor: Math.min(state.value.length, state.cursor + 1),
			},
			submittedValue: null,
		};
	}

	if (key.name === "home") {
		return {
			state: {
				value: state.value,
				cursor: 0,
			},
			submittedValue: null,
		};
	}

	if (key.name === "end") {
		return {
			state: {
				value: state.value,
				cursor: state.value.length,
			},
			submittedValue: null,
		};
	}

	const sequence = key.sequence ?? "";
	const singleChar = sequence.length === 1 ? sequence : null;
	const isBackspaceChar = singleChar === "\u0008" || singleChar === "\u007f";
	if (isBackspaceChar) {
		if (state.cursor <= 0) {
			return { state, submittedValue: null };
		}
		const nextValue =
			state.value.slice(0, state.cursor - 1) + state.value.slice(state.cursor);
		return {
			state: {
				value: nextValue,
				cursor: state.cursor - 1,
			},
			submittedValue: null,
		};
	}

	if (singleChar && singleChar >= " " && singleChar <= "~") {
		const nextValue =
			state.value.slice(0, state.cursor) +
			singleChar +
			state.value.slice(state.cursor);
		return {
			state: {
				value: nextValue,
				cursor: state.cursor + 1,
			},
			submittedValue: null,
		};
	}

	return { state, submittedValue: null };
}

export function applyTokenEdit(
	prev: ParsedCommand,
	tokenIndex: number,
	newValue: string,
): ApplyTokenEditResult {
	const editedTokens = tokenizeInput(newValue);
	const splicedTokens = [
		...prev.tokens.slice(0, tokenIndex),
		...editedTokens,
		...prev.tokens.slice(tokenIndex + 1),
	];
	return {
		command: rebuildParsedCommandFromTokens(splicedTokens),
		startIndex: tokenIndex,
		removedCount: 1,
		insertedCount: editedTokens.length,
	};
}

export function BuildApp({ command, onExit }: BuildAppProps) {
	const { parsedCommand, setParsedCommand } = useParsedCommand({ command });

	const parsedTokens = useMemo(
		() => parseTokens(parsedCommand.tokens),
		[parsedCommand.tokens],
	);

	const {
		descriptions,
		isLoading,
		error,
		loadDescriptions,
		resetDescriptions,
	} = useTokenDescriptions({
		command: parsedCommand,
		tokenCount: parsedTokens.length,
	});

	// Handle token edits by updating the parsed command
	const handleTokenEdit = useCallback(
		(tokenIndex: number, newValue: string) => {
			setParsedCommand((prev) => {
				const { command: nextCommand } = applyTokenEdit(
					prev,
					tokenIndex,
					newValue,
				);
				resetDescriptions();
				return nextCommand;
			});
		},
		[resetDescriptions, setParsedCommand],
	);

	const handleExit = useCallback(
		(submitted: boolean) => {
			resetDescriptions();
			onExit?.(parsedCommand.originalCommand, submitted);
		},
		[onExit, parsedCommand, resetDescriptions],
	);

	const {
		mode,
		selectedIndex,
		viewMode,
		leaderActive,
		editingTokenIndex,
		editingValue,
		cursorPosition,
		exitInsertMode,
		updateEditingValue,
	} = useVimMode({
		parsedTokens,
		loadDescriptions,
		onTokenEdit: handleTokenEdit,
		onExit: handleExit,
	});
	const tokenWidths = useTokenWidth({ parsedTokens });
	const coloredTokens = useColoredTokens({ parsedTokens, selectedIndex });

	const tokenPositions = useMemo(
		() => calculateTokenPositions(parsedTokens, descriptions),
		[parsedTokens, descriptions],
	);

	if (!parsedTokens.length) {
		return (
			<EmptyCommandBuilder
				onSubmit={(draft) => {
					const trimmed = draft.trim();
					if (!trimmed.length) {
						return;
					}
					resetDescriptions();
					setParsedCommand(buildParsedCommand(trimmed));
				}}
			/>
		);
	}

	return (
		<box
			border
			borderStyle="rounded"
			flexDirection="column"
			height="100%"
			width="100%"
			padding={1}
		>
			<box
				flexGrow={1}
				width="100%"
				height="100%"
				justifyContent="center"
				alignItems="center"
			>
				{viewMode === "annotated" ? (
					<TokenAnnotatedView
						tokenPositions={tokenPositions}
						selectedIndex={selectedIndex}
						mode={mode}
						editingTokenIndex={editingTokenIndex}
						editingValue={editingValue}
						cursorPosition={cursorPosition}
						onTokenChange={updateEditingValue}
					/>
				) : (
					<TokenListView
						coloredTokens={coloredTokens}
						descriptions={descriptions}
						tokenWidths={tokenWidths}
						mode={mode}
						selectedIndex={selectedIndex}
						editingTokenIndex={editingTokenIndex}
						editingValue={editingValue}
						cursorPosition={cursorPosition}
						onTokenChange={updateEditingValue}
					/>
				)}
			</box>
			<Footer
				mode={mode}
				viewMode={viewMode}
				leaderActive={leaderActive}
				isLoading={isLoading}
				error={error}
			/>
		</box>
	);
}

interface EmptyCommandBuilderProps {
	onSubmit: (draft: string) => void;
}

function EmptyCommandBuilder({ onSubmit }: EmptyCommandBuilderProps) {
	const [draftState, setDraftState] = useState<EmptyDraftState>(
		emptyDraftInitialState,
	);

	useKeyboard((key) => {
		setDraftState((prev) => {
			const result = processEmptyDraftKey(prev, key);
			if (result.submittedValue !== null) {
				const trimmed = result.submittedValue.trim();
				if (trimmed.length > 0) {
					onSubmit(trimmed);
				}
				return emptyDraftInitialState;
			}
			return result.state;
		});
	});

	const before = draftState.value.slice(0, draftState.cursor);
	const after = draftState.value.slice(draftState.cursor);
	const caretLine = `${before}|${after}`;

	return (
		<box
			flexDirection="column"
			alignItems="center"
			justifyContent="center"
			height="100%"
			width="100%"
		>
			<text>Start building a command</text>
			<text>Type to add text, press Enter to continue</text>
			<box marginTop={1}>
				<text>{caretLine.length ? caretLine : "|"}</text>
			</box>
		</box>
	);
}
