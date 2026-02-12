import { useTerminalDimensions } from "@opentui/react";
import type { VimMode } from "../hooks/useVimMode";
import type { TokenPosition } from "../utils/tokenPositions";
import { AnnotatedCommand } from "./AnnotatedCommand";

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

	return (
		<box width="100%" height="100%" justifyContent="center" alignItems="center">
			<scrollbox height="100%">
				<AnnotatedCommand
					tokenPositions={tokenPositions}
					selectedIndex={selectedIndex}
					mode={mode}
					editingTokenIndex={editingTokenIndex}
					editingValue={editingValue}
					cursorPosition={cursorPosition}
					onTokenChange={onTokenChange}
					maxWidth={maxWidth}
				/>
			</scrollbox>
		</box>
	);
}
