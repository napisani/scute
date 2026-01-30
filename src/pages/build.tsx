import { useKeyboard } from "@opentui/react";
import { useMemo } from "react";
import { Footer } from "../components/Footer";
import { Spinner } from "../components/Spinner";
import { TokenAnnotatedView } from "../components/TokenAnnotatedView";
import { TokenListView } from "../components/TokenListView";
import { getKeybindings } from "../config";
import { parseTokens } from "../core/shells";
import type { ParsedCommand } from "../core/shells/common";
import { useColoredTokens } from "../hooks/useColoredTokens";
import { useTokenDescriptions } from "../hooks/useTokenDescriptions";
import { useTokenNavigation } from "../hooks/useTokenNavigation";
import { useTokenWidth } from "../hooks/useTokenWidth";
import { useViewMode } from "../hooks/useViewMode";
import { calculateTokenPositions } from "../utils/tokenPositions";

type BuildAppProps = {
	command: ParsedCommand;
};

export function BuildApp({ command }: BuildAppProps) {
	const parsedTokens = useMemo(
		() => parseTokens(command.tokens),
		[command.tokens],
	);

	const { selectedIndex } = useTokenNavigation(parsedTokens.length);
	const { descriptions, isLoading, loadDescriptions } = useTokenDescriptions(
		command,
		parsedTokens.length,
	);
	const { viewMode } = useViewMode();
	const tokenWidths = useTokenWidth(parsedTokens);
	const coloredTokens = useColoredTokens(parsedTokens, selectedIndex);

	const tokenPositions = useMemo(
		() => calculateTokenPositions(parsedTokens, descriptions),
		[parsedTokens, descriptions],
	);

	const explainKeys = useMemo(() => getKeybindings("explain"), []);

	useKeyboard((key) => {
		if (explainKeys.includes(key.name)) {
			void loadDescriptions();
		}
	});

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
					/>
				) : (
					<TokenListView
						coloredTokens={coloredTokens}
						descriptions={descriptions}
						tokenWidths={tokenWidths}
					/>
				)}
			</box>
			<Footer isLoading={isLoading} />
		</box>
	);
}
