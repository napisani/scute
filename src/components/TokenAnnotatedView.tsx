import { renderAnnotatedCommand } from "../utils/annotatedRenderer";
import type { TokenPosition } from "../utils/tokenPositions";

interface TokenAnnotatedViewProps {
	tokenPositions: TokenPosition[];
	selectedIndex: number;
}

export function TokenAnnotatedView({
	tokenPositions,
	selectedIndex,
}: TokenAnnotatedViewProps) {
	const annotatedLines = renderAnnotatedCommand(tokenPositions, selectedIndex);

	return (
		<scrollbox height="100%">
			{annotatedLines.map((line, index) => (
				<box key={`annotated-line-${index}-${Math.random()}`}>
					{line.content}
				</box>
			))}
		</scrollbox>
	);
}
