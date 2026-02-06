import type { ReactNode } from "react";
import { TokenEditor } from "../components/TokenEditor";
import { getThemeColorFor, getTokenColor } from "../config";
import type { VimMode } from "../hooks/useVimMode";
import type { TokenPosition } from "./tokenPositions";

export function renderAnnotatedCommand(
	tokenPositions: TokenPosition[],
	selectedIndex: number,
	mode: VimMode,
	editingTokenIndex: number | null,
	editingValue: string,
	cursorPosition: number,
	onTokenChange: (value: string) => void,
	maxWidth: number,
): ReactNode[] {
	if (tokenPositions.length === 0) return [];

	const descriptionColor = getThemeColorFor("tokenDescription");
	const markerColor = getThemeColorFor("markerColor");

	const rows = buildTokenRows(
		tokenPositions,
		maxWidth,
		editingTokenIndex,
		editingValue,
	);
	const lines: ReactNode[] = [];

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
				const tokenValue = selectedToken.token.value;
				const selectedLength = getTokenValueLength(
					selectedToken,
					editingTokenIndex,
					editingValue,
				);
				const boxWidth = Math.max(selectedLength, tokenValue.length) + 2;
				const connectorPos = startPos + Math.floor(boxWidth / 2);

				const descriptionLines = buildCenteredDescriptionLines(
					selectedToken.description,
					maxWidth,
					connectorPos,
				);
				for (const descriptionLine of descriptionLines) {
					lines.push(<text fg={markerColor}>{descriptionLine}</text>);
				}
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
			topBorderLineElement,
			contentLineElement,
			bottomBorderLineElement,
		);
	}

	return lines;
}

function buildCenteredDescriptionLines(
	description: string,
	maxWidth: number,
	connectorPos: number,
): string[] {
	const width = Math.max(1, maxWidth);
	const sanitized = description.replace(/\s+/g, " ").trim();
	const maxContentWidth = Math.max(1, width - 4);
	const wrapped = wrapText(sanitized, maxContentWidth);
	const maxLineLength = wrapped.reduce(
		(max, line) => Math.max(max, line.length),
		0,
	);
	const innerWidth = Math.max(2, Math.min(width - 2, maxLineLength + 2));
	const boxWidth = innerWidth + 2;
	const leftPadding = Math.max(0, Math.floor((width - boxWidth) / 2));
	const topLine = " ".repeat(leftPadding) + "┌" + "─".repeat(innerWidth) + "┐";
	const contentLines = wrapped.map(
		(line) =>
			" ".repeat(leftPadding) + `│ ${line.padEnd(innerWidth - 2, " ")} │`,
	);
	const bottomLine =
		" ".repeat(leftPadding) + "└" + "─".repeat(innerWidth) + "┘";
	const boxCenter = leftPadding + Math.floor(boxWidth / 2);

	const connectorStem = buildConnectorStemLine(width, boxCenter);
	const connectorLine = buildConnectorLine(width, boxCenter, connectorPos);

	return [topLine, ...contentLines, bottomLine, connectorStem, connectorLine];
}

function wrapText(value: string, maxWidth: number): string[] {
	if (!value) return [""];
	if (maxWidth <= 0) return [""];
	const words = value.split(" ");
	const lines: string[] = [];
	let current = "";
	for (const word of words) {
		if (word.length > maxWidth) {
			if (current) {
				lines.push(current);
				current = "";
			}
			let start = 0;
			while (start < word.length) {
				lines.push(word.slice(start, start + maxWidth));
				start += maxWidth;
			}
			continue;
		}
		if (!current) {
			current = word;
			continue;
		}
		if (current.length + 1 + word.length <= maxWidth) {
			current = `${current} ${word}`;
		} else {
			lines.push(current);
			current = word;
		}
	}
	if (current) {
		lines.push(current);
	}
	return lines.length ? lines : [""];
}

function buildConnectorStemLine(width: number, center: number): string {
	const line = new Array(width).fill(" ");
	if (center >= 0 && center < width) {
		line[center] = "│";
	}
	return line.join("");
}

function buildConnectorLine(width: number, from: number, to: number): string {
	const line = new Array(width).fill(" ");
	const clampedFrom = from >= 0 && from < width;
	const clampedTo = to >= 0 && to < width;
	const isSame = from === to;
	if (clampedFrom) {
		if (isSame) {
			line[from] = "│";
		} else if (to > from) {
			line[from] = "└";
		} else {
			line[from] = "┘";
		}
	}
	if (clampedTo && !isSame) {
		if (to > from) {
			line[to] = "┐";
		} else {
			line[to] = "┌";
		}
	}
	if (isSame) {
		return line.join("");
	}
	const start = Math.max(0, Math.min(from, to));
	const end = Math.min(width - 1, Math.max(from, to));
	for (let i = start; i <= end; i++) {
		if (line[i] === " ") {
			line[i] = "─";
		}
	}
	return line.join("");
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

		const value = tp.token.value;
		const isSelected = tp.index === selectedIndex;
		const isEditing = mode === "insert" && editingTokenIndex === tp.index;
		const tokenColor = getTokenColor(tp.token.type);

		if (isSelected && !isEditing) {
			const leftCorner = borderType === "top" ? "┌" : "└";
			const rightCorner = borderType === "top" ? "┐" : "┘";
			elements.push(
				<text key={`border-${i}`} fg={markerColor}>
					{leftCorner}
					{"─".repeat(value.length)}
					{rightCorner}
				</text>,
			);
		} else if (isEditing) {
			// When editing, show border around the editing value length
			const leftCorner = borderType === "top" ? "┌" : "└";
			const rightCorner = borderType === "top" ? "┐" : "┘";
			elements.push(
				<text key={`border-${i}`} fg={markerColor}>
					{leftCorner}
					{"─".repeat(Math.max(editingValue.length, value.length))}
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
): ReactNode {
	const elements: ReactNode[] = [];

	for (let i = 0; i < rowTokens.length; i++) {
		const tp = rowTokens[i];
		if (!tp) continue;

		const value = tp.token.value;
		const isSelected = tp.index === selectedIndex;
		const isEditing = mode === "insert" && editingTokenIndex === tp.index;
		const tokenColor = getTokenColor(tp.token.type);

		if (isEditing) {
			// Show input field when editing
			elements.push(
				<TokenEditor
					key={`content-${i}`}
					value={editingValue}
					cursorPosition={cursorPosition}
					color={tokenColor}
					onChange={onTokenChange}
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
	const value = token.token.value;
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
	return token.token.value.length;
}
