import type { VimMode } from "../hooks/useVimMode";
import {
	type AnnotatedLine,
	renderAnnotatedCommand,
} from "../utils/annotatedRenderer";
import type { TokenPosition } from "../utils/tokenPositions";

interface TokenAnnotatedViewProps {
	tokenPositions: TokenPosition[];
	selectedIndex: number;
	mode: VimMode;
	editingTokenIndex: number | null;
	editingValue: string;
	cursorPosition: number;
	onTokenChange: (value: string) => void;
	onExitEdit: (save: boolean) => void;
}

export function TokenAnnotatedView({
	tokenPositions,
	selectedIndex,
	mode,
	editingTokenIndex,
	editingValue,
	cursorPosition,
	onTokenChange,
	onExitEdit,
}: TokenAnnotatedViewProps) {
	const annotatedLines = renderAnnotatedCommand(
		tokenPositions,
		selectedIndex,
		mode,
		editingTokenIndex,
		editingValue,
		cursorPosition,
		onTokenChange,
		onExitEdit,
	);

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
