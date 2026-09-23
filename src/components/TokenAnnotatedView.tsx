import { useTerminalDimensions } from "@opentui/react";
import type { TokenPosition } from "../utils/tokenPositions";
import { AnnotatedCommand } from "./AnnotatedCommand";

interface TokenAnnotatedViewProps {
	tokenPositions: TokenPosition[];
	selectedIndex: number;
	editingTokenIndex: number | null;
	editingValue: string;
	onTokenChange: (value: string) => void;
}

export function TokenAnnotatedView({
	tokenPositions,
	selectedIndex,
	editingTokenIndex,
	editingValue,
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
					editingTokenIndex={editingTokenIndex}
					editingValue={editingValue}
					onTokenChange={onTokenChange}
					maxWidth={maxWidth}
				/>
			</scrollbox>
		</box>
	);
}
