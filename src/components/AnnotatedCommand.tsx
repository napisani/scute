import { useMemo } from "react";
import { buildTokenRows } from "../utils/annotatedRenderer.utils";
import type { TokenPosition } from "../utils/tokenPositions";
import { TokenRow } from "./TokenRow";

interface AnnotatedCommandProps {
	tokenPositions: TokenPosition[];
	selectedIndex: number;
	editingTokenIndex: number | null;
	editingValue: string;
	onTokenChange: (value: string) => void;
	maxWidth: number;
}

export function AnnotatedCommand({
	tokenPositions,
	selectedIndex,
	editingTokenIndex,
	editingValue,
	onTokenChange,
	maxWidth,
}: AnnotatedCommandProps) {
	const rows = useMemo(
		() =>
			buildTokenRows(tokenPositions, maxWidth, editingTokenIndex, editingValue),
		[tokenPositions, maxWidth, editingTokenIndex, editingValue],
	);

	if (tokenPositions.length === 0) {return null;}

	return (
		<box
			flexDirection="column"
			minHeight="100%"
			width="100%"
			justifyContent="center"
			alignItems="flex-start"
		>
			{rows.map((row) => (
				<TokenRow
					key={`row-${row[0]?.index ?? 0}`}
					row={row}
					selectedIndex={selectedIndex}
					editingTokenIndex={editingTokenIndex}
					editingValue={editingValue}
					onTokenChange={onTokenChange}
					maxWidth={maxWidth}
				/>
			))}
		</box>
	);
}
