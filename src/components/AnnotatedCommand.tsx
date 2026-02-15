import { useMemo } from "react";
import type { VimMode } from "../hooks/useVimMode";
import { buildTokenRows } from "../utils/annotatedRenderer.utils";
import type { TokenPosition } from "../utils/tokenPositions";
import { TokenRow } from "./TokenRow";

interface AnnotatedCommandProps {
	tokenPositions: TokenPosition[];
	selectedIndex: number;
	mode: VimMode;
	editingTokenIndex: number | null;
	editingValue: string;
	onTokenChange: (value: string) => void;
	maxWidth: number;
}

export function AnnotatedCommand({
	tokenPositions,
	selectedIndex,
	mode,
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

	if (tokenPositions.length === 0) return null;

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
					mode={mode}
					editingTokenIndex={editingTokenIndex}
					editingValue={editingValue}
					onTokenChange={onTokenChange}
					maxWidth={maxWidth}
				/>
			))}
		</box>
	);
}
