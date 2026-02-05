import { useCallback, useMemo } from "react";
import { Footer } from "../components/Footer";
import { TokenAnnotatedView } from "../components/TokenAnnotatedView";
import { TokenListView } from "../components/TokenListView";
import {
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
	onSubmit?: (nextCommand: string) => void;
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

export function BuildApp({ command, onSubmit }: BuildAppProps) {
	const { parsedCommand, setParsedCommand } = useParsedCommand({ command });

	const parsedTokens = useMemo(
		() => parseTokens(parsedCommand.tokens),
		[parsedCommand.tokens],
	);

	const { descriptions, isLoading, loadDescriptions, resetDescriptions } =
		useTokenDescriptions({
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

	const handleSubmit = useCallback(() => {
		resetDescriptions();
		onSubmit?.(parsedCommand.originalCommand);
	}, [onSubmit, parsedCommand, resetDescriptions]);

	const {
		mode,
		selectedIndex,
		viewMode,
		editingTokenIndex,
		editingValue,
		cursorPosition,
		exitInsertMode,
		updateEditingValue,
	} = useVimMode({
		parsedTokens,
		loadDescriptions,
		onTokenEdit: handleTokenEdit,
		onSubmit: handleSubmit,
	});
	const tokenWidths = useTokenWidth({ parsedTokens });
	const coloredTokens = useColoredTokens({ parsedTokens, selectedIndex });

	const tokenPositions = useMemo(
		() => calculateTokenPositions(parsedTokens, descriptions),
		[parsedTokens, descriptions],
	);

	if (!parsedTokens.length) {
		return <text>(no tokens)</text>;
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
			<Footer mode={mode} viewMode={viewMode} isLoading={isLoading} />
		</box>
	);
}
