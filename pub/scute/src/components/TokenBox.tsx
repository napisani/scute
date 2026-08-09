import { getThemeColorFor, getTokenColor } from "../config";
import type { TokenPosition } from "../utils/tokenPositions";
import { TokenEditor } from "./TokenEditor";

interface TokenBoxProps {
	tp: TokenPosition;
	isSelected: boolean;
	isEditing: boolean;
	editingValue: string;
	onTokenChange: (value: string) => void;
}

export function TokenBox({
	tp,
	isSelected,
	isEditing,
	editingValue,
	onTokenChange,
}: TokenBoxProps) {
	const tokenColor = getTokenColor(tp.token.type);
	const markerColor = getThemeColorFor("markerColor");

	if (isEditing) {
		return (
			<box
				border
				borderStyle="single"
				borderColor={markerColor}
				minWidth={tp.token.value.length + 2}
			>
				<TokenEditor
					value={editingValue}
					color={tokenColor}
					onChange={onTokenChange}
				/>
			</box>
		);
	}

	if (isSelected) {
		return (
			<box border borderStyle="single" borderColor={markerColor}>
				<text fg={markerColor}>{tp.token.value}</text>
			</box>
		);
	}

	// Unselected: pad to match the visual width of a bordered token
	// A bordered box adds 1 char on each side, so we pad with 1 space each side
	return (
		<box paddingLeft={1} paddingRight={1}>
			<text fg={tokenColor}>{tp.token.value}</text>
		</box>
	);
}
