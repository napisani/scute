import type { ReactNode } from "react";
import { getThemeColorFor, getTokenColor } from "../config";
import type { VimMode } from "../hooks/useVimMode";
import { formatToken } from "./tokenFormatters";
import type { TokenPosition } from "./tokenPositions";

export interface AnnotatedLine {
	content: ReactNode;
}

export function renderAnnotatedCommand(
	tokenPositions: TokenPosition[],
	selectedIndex: number,
	mode: VimMode,
	editingTokenIndex: number | null,
	editingValue: string,
	cursorPosition: number,
	onTokenChange: (value: string) => void,
	onExitEdit: (save: boolean) => void,
	maxWidth: number,
): AnnotatedLine[] {
	if (tokenPositions.length === 0) return [];

	const descriptionColor = getThemeColorFor("tokenDescription");
	const markerColor = getThemeColorFor("markerColor");

	const rows = buildTokenRows(
		tokenPositions,
		maxWidth,
		editingTokenIndex,
		editingValue,
	);
	const lines: AnnotatedLine[] = [];

	for (const row of rows) {
		const tokenStartPositions = buildTokenStartPositions(
			row,
			editingTokenIndex,
			editingValue,
		);
		const selectedToken = row.find((tp) => tp.index === selectedIndex);
		if (selectedToken?.description) {
			const startPos = tokenStartPositions[selectedIndex];
			if (startPos !== undefined) {
				const tokenValue = formatToken(selectedToken.token);
				const selectedLength = getTokenValueLength(
					selectedToken,
					editingTokenIndex,
					editingValue,
				);
				const boxWidth = Math.max(selectedLength, tokenValue.length) + 2;
				const connectorPos = startPos + Math.floor(boxWidth / 2);

				const beforeConnector = " ".repeat(Math.max(0, connectorPos - 1));
				const descLine = `${beforeConnector}┌─${selectedToken.description}`;
				lines.push({
					content: <text fg={markerColor}>{descLine}</text>,
				});

				const verticalLine = `${beforeConnector}│`;
				lines.push({
					content: <text fg={markerColor}>{verticalLine}</text>,
				});
			}
		}

		const topBorderLineElement = buildBorderLineElement(
			row,
			selectedIndex,
			mode,
			editingTokenIndex,
			editingValue,
			markerColor,
			"top",
		);
		const contentLineElement = buildContentLineElement(
			row,
			selectedIndex,
			mode,
			editingTokenIndex,
			editingValue,
			cursorPosition,
			onTokenChange,
			onExitEdit,
		);
		const bottomBorderLineElement = buildBorderLineElement(
			row,
			selectedIndex,
			mode,
			editingTokenIndex,
			editingValue,
			markerColor,
			"bottom",
		);

		lines.push(
			{ content: topBorderLineElement },
			{ content: contentLineElement },
			{ content: bottomBorderLineElement },
		);
	}

	return lines;
}

function buildBorderLineElement(
	rowTokens: TokenPosition[],
	selectedIndex: number,
	mode: VimMode,
	editingTokenIndex: number | null,
	editingValue: string,
	markerColor: string,
	borderType: "top" | "bottom",
): ReactNode {
	const elements: ReactNode[] = [];

	for (let i = 0; i < rowTokens.length; i++) {
		const tp = rowTokens[i];
		if (!tp) continue;

		const value = formatToken(tp.token);
		const isSelected = tp.index === selectedIndex;
		const isEditing = mode === "insert" && editingTokenIndex === tp.index;
		const tokenColor = getTokenColor(tp.token.type);

		if (isSelected && !isEditing) {
			const borderChar = borderType === "top" ? "─" : "─";
			const leftCorner = borderType === "top" ? "┌" : "└";
			const rightCorner = borderType === "top" ? "┐" : "┘";
			elements.push(
				<text key={`border-${i}`} fg={markerColor}>
					{leftCorner}
					{borderChar.repeat(value.length)}
					{rightCorner}
				</text>,
			);
		} else if (isEditing) {
			// When editing, show border around the editing value length
			const borderChar = borderType === "top" ? "─" : "─";
			const leftCorner = borderType === "top" ? "┌" : "└";
			const rightCorner = borderType === "top" ? "┐" : "┘";
			elements.push(
				<text key={`border-${i}`} fg={markerColor}>
					{leftCorner}
					{borderChar.repeat(Math.max(editingValue.length, value.length))}
					{rightCorner}
				</text>,
			);
		} else {
			elements.push(
				<text key={`border-${i}`} fg={tokenColor}>
					{" "}
					{" ".repeat(value.length)}{" "}
				</text>,
			);
		}

		if (i < rowTokens.length - 1) {
			elements.push(<text key={`space-${i}`}> </text>);
		}
	}

	return <box style={{ flexDirection: "row" }}>{elements}</box>;
}

function buildContentLineElement(
	rowTokens: TokenPosition[],
	selectedIndex: number,
	mode: VimMode,
	editingTokenIndex: number | null,
	editingValue: string,
	cursorPosition: number,
	onTokenChange: (value: string) => void,
	onExitEdit: (save: boolean) => void,
): ReactNode {
	const elements: ReactNode[] = [];

	for (let i = 0; i < rowTokens.length; i++) {
		const tp = rowTokens[i];
		if (!tp) continue;

		const value = formatToken(tp.token);
		const isSelected = tp.index === selectedIndex;
		const isEditing = mode === "insert" && editingTokenIndex === tp.index;
		const tokenColor = getTokenColor(tp.token.type);

		if (isEditing) {
			// Show input field when editing
			elements.push(
				<input
					key={`content-${i}`}
					value={editingValue}
					onChange={onTokenChange}
					focused
					width={Math.max(editingValue.length + 2, value.length + 2, 10)}
					textColor={tokenColor}
					cursorColor="#FFFFFF"
					backgroundColor="transparent"
				/>,
			);
		} else if (isSelected) {
			const markerColor = getThemeColorFor("markerColor");
			elements.push(
				<text key={`content-${i}`} fg={markerColor}>
					{"│"}
					{value}
					{"│"}
				</text>,
			);
		} else {
			elements.push(
				<text key={`content-${i}`} fg={tokenColor}>
					{" "}
					{value}{" "}
				</text>,
			);
		}

		if (i < rowTokens.length - 1) {
			elements.push(<text key={`space-${i}`}> </text>);
		}
	}

	return <box style={{ flexDirection: "row" }}>{elements}</box>;
}

function buildTokenRows(
	tokenPositions: TokenPosition[],
	maxWidth: number,
	editingTokenIndex: number | null,
	editingValue: string,
): TokenPosition[][] {
	if (maxWidth <= 0) {
		return [tokenPositions];
	}

	const rows: TokenPosition[][] = [];
	let currentRow: TokenPosition[] = [];
	let currentWidth = 0;

	for (const token of tokenPositions) {
		const tokenWidth = getTokenDisplayWidth(
			token,
			editingTokenIndex,
			editingValue,
		);
		const nextWidth = currentRow.length
			? currentWidth + 1 + tokenWidth
			: tokenWidth;
		if (currentRow.length && nextWidth > maxWidth) {
			rows.push(currentRow);
			currentRow = [token];
			currentWidth = tokenWidth;
			continue;
		}
		currentRow.push(token);
		currentWidth = nextWidth;
	}

	if (currentRow.length) {
		rows.push(currentRow);
	}

	return rows;
}

function buildTokenStartPositions(
	rowTokens: TokenPosition[],
	editingTokenIndex: number | null,
	editingValue: string,
): Record<number, number> {
	const positions: Record<number, number> = {};
	let cursor = 0;
	for (let i = 0; i < rowTokens.length; i++) {
		const token = rowTokens[i];
		if (!token) {
			continue;
		}
		positions[token.index] = cursor;
		cursor += getTokenDisplayWidth(token, editingTokenIndex, editingValue);
		if (i < rowTokens.length - 1) {
			cursor += 1;
		}
	}
	return positions;
}

function getTokenDisplayWidth(
	token: TokenPosition,
	editingTokenIndex: number | null,
	editingValue: string,
): number {
	const value = formatToken(token.token);
	const valueLength = getTokenValueLength(
		token,
		editingTokenIndex,
		editingValue,
	);
	return Math.max(valueLength, value.length) + 2;
}

function getTokenValueLength(
	token: TokenPosition,
	editingTokenIndex: number | null,
	editingValue: string,
): number {
	if (editingTokenIndex === token.index) {
		return editingValue.length;
	}
	return formatToken(token.token).length;
}
