import { useTerminalDimensions } from "@opentui/react";
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
}

export function TokenAnnotatedView({
	tokenPositions,
	selectedIndex,
	mode,
	editingTokenIndex,
	editingValue,
	cursorPosition,
	onTokenChange,
}: TokenAnnotatedViewProps) {
	const { width } = useTerminalDimensions();
	const maxWidth = Math.max(1, width - 4);
	const annotatedLines = renderAnnotatedCommand(
		tokenPositions,
		selectedIndex,
		mode,
		editingTokenIndex,
		editingValue,
		cursorPosition,
		onTokenChange,
		maxWidth,
	);

	return (
		<box width="100%" height="100%" justifyContent="center" alignItems="center">
			<scrollbox height="100%">
				<box
					flexDirection="column"
					minHeight="100%"
					width="100%"
					justifyContent="center"
					alignItems="flex-start"
				>
					{annotatedLines.map((line, index) => (
						<box key={`annotated-line-${index}`}>{line.content}</box>
					))}
				</box>
			</scrollbox>
		</box>
	);
}
