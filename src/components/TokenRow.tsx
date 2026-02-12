import type { ReactNode } from "react";
import { getThemeColorFor } from "../config";
import type { VimMode } from "../hooks/useVimMode";
import {
	buildTokenStartPositions,
	getTokenValueLength,
} from "../utils/annotatedRenderer.utils";
import type { TokenPosition } from "../utils/tokenPositions";
import { DescriptionBlock } from "./DescriptionBlock";
import { TokenBox } from "./TokenBox";

interface TokenRowProps {
	row: TokenPosition[];
	selectedIndex: number;
	mode: VimMode;
	editingTokenIndex: number | null;
	editingValue: string;
	cursorPosition: number;
	onTokenChange: (value: string) => void;
	maxWidth: number;
}

export function TokenRow({
	row,
	selectedIndex,
	mode,
	editingTokenIndex,
	editingValue,
	cursorPosition,
	onTokenChange,
	maxWidth,
}: TokenRowProps) {
	const descriptionColor = getThemeColorFor("tokenDescription");
	const selectedToken = row.find((tp) => tp.index === selectedIndex);

	// Calculate connector position from the token's center in the row
	const tokenStartPositions = buildTokenStartPositions(
		row,
		editingTokenIndex,
		editingValue,
	);

	let descriptionElement: ReactNode = null;

	if (selectedToken?.description) {
		const startPos = tokenStartPositions[selectedIndex];
		if (startPos !== undefined) {
			const selectedLength = getTokenValueLength(
				selectedToken,
				editingTokenIndex,
				editingValue,
			);
			const boxWidth =
				Math.max(selectedLength, selectedToken.token.value.length) + 2;
			const connectorPos = startPos + Math.floor(boxWidth / 2);

			descriptionElement = (
				<DescriptionBlock
					description={selectedToken.description}
					maxWidth={maxWidth}
					connectorPos={connectorPos}
					color={descriptionColor}
				/>
			);
		}
	}

	return (
		<box flexDirection="column">
			{descriptionElement}
			<box flexDirection="row" alignItems="center" gap={1}>
				{row.map((tp) => (
					<TokenBox
						key={tp.index}
						tp={tp}
						isSelected={tp.index === selectedIndex}
						isEditing={mode === "insert" && editingTokenIndex === tp.index}
						editingValue={editingValue}
						cursorPosition={cursorPosition}
						onTokenChange={onTokenChange}
					/>
				))}
			</box>
		</box>
	);
}
