import { useKeyboard } from "@opentui/react";
import { useCallback, useMemo, useRef, useState } from "react";
import { Footer } from "../components/Footer";
import { SuggestInput } from "../components/SuggestInput";
import { TokenAnnotatedView } from "../components/TokenAnnotatedView";
import { TokenListView } from "../components/TokenListView";

import { getThemeColorFor } from "../config";
import { generateCommand, suggest } from "../core/llm";
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
		[parsedCommand.originalCommand, resetDescriptions, setParsedCommand],
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
		[resetDescriptions, setParsedCommand],
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
	} = useVimMode({
		parsedTokens,
		loadDescriptions,
		onTokenEdit: handleTokenEdit,
		onExit: handleExit,
		onSuggestSubmit: handleSuggestSubmit,
		onGenerateSubmit: handleGenerateSubmit,
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

	const displayError = suggestError ?? generateError ?? error;
	const displayLoading = isLoading || isLoadingSuggest || isLoadingGenerate;

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
