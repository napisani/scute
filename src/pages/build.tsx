import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Footer } from "../components/Footer";
import { HistoryPicker } from "../components/HistoryPicker";
import { SuggestInput } from "../components/SuggestInput";
import { TokenAnnotatedView } from "../components/TokenAnnotatedView";
import { TokenListView } from "../components/TokenListView";

import { getThemeColorFor } from "../config";
import { fetchShellHistory } from "../core/history";
import { explain, generateCommand, suggest } from "../core/llm";
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

function fitLine(text: string, width: number): string {
	if (width <= 0) {
		return "";
	}
	if (text.length >= width) {
		return text.slice(0, width);
	}
	return text.padEnd(width, " ");
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

export function applyTokenDelete(
	prev: ParsedCommand,
	tokenIndex: number,
	deleteToEnd: boolean,
): ParsedCommand {
	const boundedIndex = Math.max(
		0,
		Math.min(prev.tokens.length - 1, tokenIndex),
	);
	const splicedTokens = deleteToEnd
		? [...prev.tokens.slice(0, boundedIndex)]
		: [
				...prev.tokens.slice(0, boundedIndex),
				...prev.tokens.slice(boundedIndex + 1),
			];
	return rebuildParsedCommandFromTokens(splicedTokens);
}

export function BuildApp({ command, onExit }: BuildAppProps) {
	const { width: terminalWidth, height: terminalHeight } =
		useTerminalDimensions();
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
	const [commandExplanation, setCommandExplanation] = useState<string | null>(
		null,
	);
	const [historyEntries, setHistoryEntries] = useState<string[] | null>(null);
	const [isLoadingHistory, setIsLoadingHistory] = useState(false);
	const [isLoadingExplain, setIsLoadingExplain] = useState(false);
	const [explainError, setExplainError] = useState<string | null>(null);
	const explainRequestIdRef = useRef(0);

	const resetExplanation = useCallback(() => {
		setCommandExplanation(null);
		setIsLoadingExplain(false);
		setExplainError(null);
		explainRequestIdRef.current += 1;
	}, []);

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
				resetExplanation();
				return nextCommand;
			});
		},
		[resetDescriptions, resetExplanation, setParsedCommand],
	);

	// Handle token deletion by removing the token at the given index
	const handleTokenDelete = useCallback(
		(options: { tokenIndex: number; deleteToEnd: boolean }) => {
			setParsedCommand((prev) => {
				const nextCommand = applyTokenDelete(
					prev,
					options.tokenIndex,
					options.deleteToEnd,
				);
				resetDescriptions();
				resetExplanation();
				return nextCommand;
			});
		},
		[resetDescriptions, resetExplanation, setParsedCommand],
	);

	const handleExit = useCallback(
		(submitted: boolean) => {
			resetDescriptions();
			resetExplanation();
			onExit?.(parsedCommand.originalCommand, submitted);
		},
		[onExit, parsedCommand, resetDescriptions, resetExplanation],
	);

	const handleExplain = useCallback(() => {
		if (isLoadingExplain) {
			return;
		}
		const currentCommand = parsedCommand.originalCommand.trim();
		if (!currentCommand.length) {
			return;
		}
		loadDescriptions();
		const requestId = explainRequestIdRef.current + 1;
		explainRequestIdRef.current = requestId;
		setIsLoadingExplain(true);
		setExplainError(null);
		setCommandExplanation("Explaining command...");
		explain(currentCommand)
			.then((result) => {
				if (explainRequestIdRef.current !== requestId) {
					return;
				}
				if (result) {
					setCommandExplanation(result);
				} else {
					setExplainError("Explain returned no result");
					setCommandExplanation(null);
				}
			})
			.catch(() => {
				if (explainRequestIdRef.current !== requestId) {
					return;
				}
				setExplainError("Explain failed");
				setCommandExplanation(null);
			})
			.finally(() => {
				if (explainRequestIdRef.current !== requestId) {
					return;
				}
				setIsLoadingExplain(false);
			});
	}, [isLoadingExplain, loadDescriptions, parsedCommand.originalCommand]);

	const [isLoadingSuggest, setIsLoadingSuggest] = useState(false);
	const [suggestError, setSuggestError] = useState<string | null>(null);

	const handleSuggestSubmit = useCallback(
		(prompt: string) => {
			const currentCommand = parsedCommand.originalCommand;
			const commandWithHint = `${currentCommand} # ${prompt}`;
			setIsLoadingSuggest(true);
			setSuggestError(null);
			suggest(commandWithHint)
				.then((result) => {
					if (result) {
						resetDescriptions();
						resetExplanation();
						setParsedCommand(buildParsedCommand(result));
					} else {
						setSuggestError("Suggest returned no result");
					}
				})
				.catch(() => {
					setSuggestError("Suggest failed");
				})
				.finally(() => {
					setIsLoadingSuggest(false);
				});
		},
		[
			parsedCommand.originalCommand,
			resetDescriptions,
			resetExplanation,
			setParsedCommand,
		],
	);

	const [isLoadingGenerate, setIsLoadingGenerate] = useState(false);
	const [generateError, setGenerateError] = useState<string | null>(null);

	const handleGenerateSubmit = useCallback(
		(prompt: string) => {
			setIsLoadingGenerate(true);
			setGenerateError(null);
			generateCommand(prompt)
				.then((result) => {
					if (result) {
						resetDescriptions();
						resetExplanation();
						setParsedCommand(buildParsedCommand(result));
					} else {
						setGenerateError("Generate returned no result");
					}
				})
				.catch(() => {
					setGenerateError("Generate failed");
				})
				.finally(() => {
					setIsLoadingGenerate(false);
				});
		},
		[resetDescriptions, resetExplanation, setParsedCommand],
	);

	const {
		mode,
		selectedIndex,
		viewMode,
		leaderActive,
		editingTokenIndex,
		editingValue,
		suggestValue,
		generateValue,
		updateEditingValue,
		updateSuggestValue,
		updateGenerateValue,
		exitHistoryMode,
	} = useVimMode({
		parsedTokens,
		loadDescriptions: handleExplain,
		onTokenEdit: handleTokenEdit,
		onTokenDelete: handleTokenDelete,
		onExit: handleExit,
		onSuggestSubmit: handleSuggestSubmit,
		onGenerateSubmit: handleGenerateSubmit,
	});

	useEffect(() => {
		if (mode !== "history") {
			return;
		}
		if (historyEntries !== null || isLoadingHistory) {
			return;
		}
		setIsLoadingHistory(true);
		const entries = fetchShellHistory();
		setHistoryEntries(entries);
		setIsLoadingHistory(false);
	}, [historyEntries, isLoadingHistory, mode]);
	const tokenWidths = useTokenWidth({ parsedTokens });
	const coloredTokens = useColoredTokens({ parsedTokens, selectedIndex });

	const tokenPositions = useMemo(
		() => calculateTokenPositions(parsedTokens, descriptions),
		[parsedTokens, descriptions],
	);

	const handleHistorySelect = useCallback(
		(command: string) => {
			exitHistoryMode();
			setHistoryEntries(null);
			setParsedCommand(buildParsedCommand(command));
			resetDescriptions();
			resetExplanation();
		},
		[exitHistoryMode, resetDescriptions, resetExplanation, setParsedCommand],
	);

	const handleHistoryCancel = useCallback(() => {
		exitHistoryMode();
		setHistoryEntries(null);
	}, [exitHistoryMode]);

	if (!parsedTokens.length && mode !== "history") {
		return (
			<EmptyCommandBuilder
				onSubmit={(draft) => {
					const trimmed = draft.trim();
					if (!trimmed.length) {
						return;
					}
					resetDescriptions();
					resetExplanation();
					setParsedCommand(buildParsedCommand(trimmed));
				}}
			/>
		);
	}

	const displayError = suggestError ?? generateError ?? explainError ?? error;
	const displayLoading =
		isLoading ||
		isLoadingSuggest ||
		isLoadingGenerate ||
		isLoadingExplain ||
		isLoadingHistory;
	const explanationLabelColor = getThemeColorFor("hintLabelColor");
	const explanationTextColor = getThemeColorFor("tokenDescription");
	const safeTerminalWidth = terminalWidth > 0 ? terminalWidth : 80;
	const safeTerminalHeight = terminalHeight > 0 ? terminalHeight : 24;
	const explanationWidth = Math.max(1, safeTerminalWidth - 4);
	const isHistoryMode = mode === "history";
	const explanationHeight = isHistoryMode ? 0 : 2;
	const inputHeight = mode === "suggest" || mode === "generate" ? 3 : 0;
	const footerHeight = 1;
	const chromeHeight = 4;
	const availableHeight = Math.max(1, safeTerminalHeight - chromeHeight);
	const viewHeight = Math.max(
		1,
		availableHeight - inputHeight - footerHeight - explanationHeight,
	);
	const mainHeight = Math.max(1, viewHeight + explanationHeight);
	const explanationLabel = commandExplanation ? "Explanation" : "";
	const explanationText = commandExplanation ?? "";

	return (
		<box
			border
			borderStyle="rounded"
			flexDirection="column"
			height="100%"
			width="100%"
			padding={1}
		>
			{mode === "suggest" && (
				<SuggestInput value={suggestValue} onChange={updateSuggestValue} />
			)}
			{mode === "generate" && (
				<SuggestInput
					value={generateValue}
					onChange={updateGenerateValue}
					title="Generate"
				/>
			)}
			{isHistoryMode ? (
				<box width="100%" height={mainHeight}>
					<HistoryPicker
						history={historyEntries ?? []}
						isLoading={isLoadingHistory}
						onSelect={handleHistorySelect}
						onCancel={handleHistoryCancel}
					/>
				</box>
			) : (
				<box width="100%" height={mainHeight} flexDirection="column">
					<box
						height={viewHeight}
						width="100%"
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
								onTokenChange={updateEditingValue}
							/>
						)}
					</box>
					<box flexDirection="column" width="100%">
						<text fg={explanationLabelColor}>
							{fitLine(explanationLabel, explanationWidth)}
						</text>
						<text fg={explanationTextColor}>
							{fitLine(explanationText, explanationWidth)}
						</text>
					</box>
				</box>
			)}
			<Footer
				mode={mode}
				viewMode={viewMode}
				leaderActive={leaderActive}
				isLoading={displayLoading}
				error={displayError}
			/>
		</box>
	);
}

interface EmptyCommandBuilderProps {
	onSubmit: (draft: string) => void;
}

function EmptyCommandBuilder({ onSubmit }: EmptyCommandBuilderProps) {
	const [draftValue, setDraftValue] = useState("");
	const draftValueRef = useRef(draftValue);
	draftValueRef.current = draftValue;
	const onSubmitRef = useRef(onSubmit);
	onSubmitRef.current = onSubmit;
	const cursorColor = getThemeColorFor("cursorColor");

	useKeyboard((key) => {
		if (key.name === "return" || key.sequence === "\r") {
			key.preventDefault?.();
			const trimmed = draftValueRef.current.trim();
			if (trimmed.length > 0) {
				onSubmitRef.current(trimmed);
				setDraftValue("");
			}
		}
	});

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
				<input
					value={draftValue}
					onInput={setDraftValue}
					focused
					width={Math.max(draftValue.length + 2, 20)}
					cursorColor={cursorColor}
					backgroundColor="transparent"
				/>
			</box>
		</box>
	);
}
