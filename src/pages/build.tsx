import { useMemo } from "react";
import { Footer } from "../components/Footer";
import { Spinner } from "../components/Spinner";
import { TokenAnnotatedView } from "../components/TokenAnnotatedView";
import { TokenListView } from "../components/TokenListView";
import { parseTokens } from "../core/shells";
import type { ParsedCommand } from "../core/shells/common";
import { useColoredTokens } from "../hooks/useColoredTokens";
import { useTokenDescriptions } from "../hooks/useTokenDescriptions";
import { useTokenWidth } from "../hooks/useTokenWidth";
import { useVimMode } from "../hooks/useVimMode";
import { calculateTokenPositions } from "../utils/tokenPositions";

type BuildAppProps = {
	command: ParsedCommand;
};

export function BuildApp({ command }: BuildAppProps) {
	const parsedTokens = useMemo(
		() => parseTokens(command.tokens),
		[command.tokens],
	);

	const { descriptions, isLoading, loadDescriptions } = useTokenDescriptions(
		command,
		parsedTokens.length,
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
	} = useVimMode(parsedTokens, loadDescriptions);
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
			<Spinner isActive={isLoading} />
			<box flexGrow={1} width="100%">
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
