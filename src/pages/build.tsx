import { useTerminalDimensions } from "@opentui/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Footer } from "../components/Footer";
import { HistoryPicker } from "../components/HistoryPicker";
import { SuggestInput } from "../components/SuggestInput";
import { TokenAnnotatedView } from "../components/TokenAnnotatedView";
import { TokenEditor } from "../components/TokenEditor";
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
import { useAsyncAction } from "../hooks/useAsyncAction";
import { useColoredTokens } from "../hooks/useColoredTokens";
import { useParsedCommand } from "../hooks/useParsedCommand";
import { useTokenDescriptions } from "../hooks/useTokenDescriptions";
import { useTokenWidth } from "../hooks/useTokenWidth";
import { useVimMode, type ViewMode, type VimMode } from "../hooks/useVimMode";
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

interface BuildContentProps {
	mode: VimMode;
	suggestValue: string;
	generateValue: string;
	updateSuggestValue: (value: string) => void;
	updateGenerateValue: (value: string) => void;
	mainHeight: number;
	historyEntries: string[] | null;
	isLoadingHistory: boolean;
	handleHistorySelect: (command: string) => void;
	handleHistoryCancel: () => void;
	parsedTokens: ReturnType<typeof parseTokens>;
	viewMode: ViewMode;
	tokenPositions: ReturnType<typeof calculateTokenPositions>;
	selectedIndex: number;
	editingTokenIndex: number | null;
	editingValue: string;
	updateEditingValue: (value: string) => void;
	viewHeight: number;
	coloredTokens: ReturnType<typeof useColoredTokens>;
	descriptions: ReturnType<typeof useTokenDescriptions>["descriptions"];
	tokenWidths: ReturnType<typeof useTokenWidth>;
	explanationLabelColor: string;
	explanationTextColor: string;
	explanationWidth: number;
	explanationLabel: string;
	explanationText: string;
}

function EmptyCommandContent({
	mode,
	editingTokenIndex,
	editingValue,
	updateEditingValue,
}: Pick<BuildContentProps, "mode" | "editingTokenIndex" | "editingValue" | "updateEditingValue">) {
	if (mode === "insert" && editingTokenIndex !== null) {
		return (
			<TokenEditor
				value={editingValue}
				color={getThemeColorFor("tokenDescription")}
				onChange={updateEditingValue}
			/>
		);
	}
	return (
		<>
			<text fg={getThemeColorFor("hintLabelColor")}>No command yet</text>
			<text fg={getThemeColorFor("hintLabelColor")}>
				Press i to type, space for actions
			</text>
		</>
	);
}

function TokenContent({
	mainHeight,
	viewMode,
	tokenPositions,
	selectedIndex,
	editingTokenIndex,
	editingValue,
	updateEditingValue,
	viewHeight,
	coloredTokens,
	descriptions,
	tokenWidths,
	explanationLabelColor,
	explanationTextColor,
	explanationWidth,
	explanationLabel,
	explanationText,
}: Pick<BuildContentProps, "mainHeight" | "viewMode" | "tokenPositions" | "selectedIndex" | "editingTokenIndex" | "editingValue" | "updateEditingValue" | "viewHeight" | "coloredTokens" | "descriptions" | "tokenWidths" | "explanationLabelColor" | "explanationTextColor" | "explanationWidth" | "explanationLabel" | "explanationText">) {
	return (
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
						editingTokenIndex={editingTokenIndex}
						editingValue={editingValue}
						onTokenChange={updateEditingValue}
					/>
				) : (
					<TokenListView
						coloredTokens={coloredTokens}
						descriptions={descriptions}
						tokenWidths={tokenWidths}
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
	);
}

type MainBuildContentProps = Omit<
	BuildContentProps,
	"suggestValue" | "generateValue" | "updateSuggestValue" | "updateGenerateValue"
>;

function MainBuildContent({
	mode,
	mainHeight,
	historyEntries,
	isLoadingHistory,
	handleHistorySelect,
	handleHistoryCancel,
	parsedTokens,
	viewMode,
	tokenPositions,
	selectedIndex,
	editingTokenIndex,
	editingValue,
	updateEditingValue,
	viewHeight,
	coloredTokens,
	descriptions,
	tokenWidths,
	explanationLabelColor,
	explanationTextColor,
	explanationWidth,
	explanationLabel,
	explanationText,
}: MainBuildContentProps) {
	if (mode === "history") {
		return (
			<box width="100%" height={mainHeight}>
				<HistoryPicker
					history={historyEntries ?? []}
					isLoading={isLoadingHistory}
					onSelect={handleHistorySelect}
					onCancel={handleHistoryCancel}
				/>
			</box>
		);
	}
	if (!parsedTokens.length) {
		return (
			<box
				width="100%"
				height={mainHeight}
				flexDirection="column"
				justifyContent="center"
				alignItems="center"
			>
				<EmptyCommandContent
					mode={mode}
					 editingTokenIndex={editingTokenIndex}
					 editingValue={editingValue}
					 updateEditingValue={updateEditingValue}
				/>
			</box>
		);
	}
	return (
		<TokenContent
			mainHeight={mainHeight}
			viewMode={viewMode}
			tokenPositions={tokenPositions}
			selectedIndex={selectedIndex}
			 editingTokenIndex={editingTokenIndex}
			 editingValue={editingValue}
			 updateEditingValue={updateEditingValue}
			viewHeight={viewHeight}
			coloredTokens={coloredTokens}
			descriptions={descriptions}
			tokenWidths={tokenWidths}
			explanationLabelColor={explanationLabelColor}
			explanationTextColor={explanationTextColor}
			explanationWidth={explanationWidth}
			explanationLabel={explanationLabel}
			explanationText={explanationText}
		/>
	);
}

function BuildContent({
	mode,
	suggestValue,
	generateValue,
	updateSuggestValue,
	updateGenerateValue,
	...contentProps
}: BuildContentProps) {
	return (
		<>
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
			<MainBuildContent mode={mode} {...contentProps} />
		</>
	);
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
	const explainAction = useAsyncAction<string>("Explain failed");

	const resetExplanation = useCallback(() => {
		setCommandExplanation(null);
		explainAction.reset();
	}, [explainAction.reset]);

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
		if (explainAction.isLoading) {
			return;
		}
		const currentCommand = parsedCommand.originalCommand.trim();
		if (!currentCommand.length) {
			return;
		}
		loadDescriptions();
		setCommandExplanation("Explaining command...");
		explainAction.run(() => explain(currentCommand), {
			onSuccess: setCommandExplanation,
			onError: () => setCommandExplanation(null),
			emptyResultMessage: "Explain returned no result",
		});
	}, [
		explainAction.isLoading,
		explainAction.run,
		loadDescriptions,
		parsedCommand.originalCommand,
	]);

	const suggestAction = useAsyncAction<string>("Suggest failed");

	const handleSuggestSubmit = useCallback(
		(prompt: string) => {
			const currentCommand = parsedCommand.originalCommand;
			const commandWithHint = `${currentCommand} # ${prompt}`;
			suggestAction.run(() => suggest(commandWithHint), {
				onSuccess: (result) => {
					resetDescriptions();
					resetExplanation();
					setParsedCommand(buildParsedCommand(result));
				},
				emptyResultMessage: "Suggest returned no result",
			});
		},
		[
			parsedCommand.originalCommand,
			resetDescriptions,
			resetExplanation,
			setParsedCommand,
			suggestAction.run,
		],
	);

	const generateAction = useAsyncAction<string>("Generate failed");

	const handleGenerateSubmit = useCallback(
		(prompt: string) => {
			generateAction.run(() => generateCommand(prompt), {
				onSuccess: (result) => {
					resetDescriptions();
					resetExplanation();
					setParsedCommand(buildParsedCommand(result));
				},
				emptyResultMessage: "Generate returned no result",
			});
		},
		[resetDescriptions, resetExplanation, setParsedCommand, generateAction.run],
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

	const displayError =
		suggestAction.error ?? generateAction.error ?? explainAction.error ?? error;
	const displayLoading =
		isLoading ||
		suggestAction.isLoading ||
		generateAction.isLoading ||
		explainAction.isLoading ||
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
			<BuildContent
				mode={mode}
				suggestValue={suggestValue}
				generateValue={generateValue}
				updateSuggestValue={updateSuggestValue}
				updateGenerateValue={updateGenerateValue}
				mainHeight={mainHeight}
				historyEntries={historyEntries}
				isLoadingHistory={isLoadingHistory}
				handleHistorySelect={handleHistorySelect}
				handleHistoryCancel={handleHistoryCancel}
				parsedTokens={parsedTokens}
				viewMode={viewMode}
				tokenPositions={tokenPositions}
				selectedIndex={selectedIndex}
				editingTokenIndex={editingTokenIndex}
				editingValue={editingValue}
				updateEditingValue={updateEditingValue}
				viewHeight={viewHeight}
				coloredTokens={coloredTokens}
				descriptions={descriptions}
				tokenWidths={tokenWidths}
				explanationLabelColor={explanationLabelColor}
				explanationTextColor={explanationTextColor}
				explanationWidth={explanationWidth}
				explanationLabel={explanationLabel}
				explanationText={explanationText}
			/>
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
