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
};

export function applyTokenEdit(
	prev: ParsedCommand,
	tokenIndex: number,
	newValue: string,
): ParsedCommand {
	const editedTokens = tokenizeInput(newValue);
	const splicedTokens = [
		...prev.tokens.slice(0, tokenIndex),
		...editedTokens,
		...prev.tokens.slice(tokenIndex),
	];
	return rebuildParsedCommandFromTokens(splicedTokens);
}

export function BuildApp({ command }: BuildAppProps) {
	const { parsedCommand, setParsedCommand } = useParsedCommand(command);

	const parsedTokens = useMemo(
		() => parseTokens(parsedCommand.tokens),
		[parsedCommand.tokens],
	);

	const { descriptions, isLoading, loadDescriptions } = useTokenDescriptions(
		parsedCommand,
		parsedTokens.length,
	);

	// Handle token edits by updating the parsed command
	const handleTokenEdit = useCallback(
		(tokenIndex: number, newValue: string) => {
			setParsedCommand((prev) => {
				return applyTokenEdit(prev, tokenIndex, newValue);
			});
		},
		[setParsedCommand],
	);

	const {
		mode,
		selectedIndex,
		viewMode,
		editingTokenIndex,
		editingValue,
		cursorPosition,
		exitInsertMode,
		updateEditingValue,
	} = useVimMode(parsedTokens, loadDescriptions, handleTokenEdit);
	const tokenWidths = useTokenWidth(parsedTokens);
	const coloredTokens = useColoredTokens(parsedTokens, selectedIndex);

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
						onExitEdit={exitInsertMode}
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
						onExitEdit={exitInsertMode}
					/>
				)}
			</box>
			<Footer mode={mode} viewMode={viewMode} isLoading={isLoading} />
		</box>
	);
}
