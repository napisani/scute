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
): AnnotatedLine[] {
	if (tokenPositions.length === 0) return [];

	const descriptionColor = getThemeColorFor("tokenDescription");
	const markerColor = getThemeColorFor("markerColor");

	// Build command line with proper spacing tracking
	let commandLine = "";
	const tokenStartPositions: number[] = [];

	for (let i = 0; i < tokenPositions.length; i++) {
		const tp = tokenPositions[i];
		if (!tp) continue;

		// Track where this token starts in the command line
		tokenStartPositions[i] = commandLine.length;

		const value = formatToken(tp.token);
		const isSelected = i === selectedIndex;

		if (isSelected) {
			// Selected token: box with square border
			commandLine += `┌${"─".repeat(value.length)}┐`;
		} else {
			// Non-selected: invisible box (spaces for alignment)
			commandLine += ` ${" ".repeat(value.length)} `;
		}

		// Add space between tokens (but not after the last one)
		if (i < tokenPositions.length - 1) {
			commandLine += " ";
		}
	}

	const lines: AnnotatedLine[] = [];

	// Only show description for the currently selected token
	const selectedTp = tokenPositions[selectedIndex];
	if (selectedTp?.description) {
		const startPos = tokenStartPositions[selectedIndex];
		if (startPos !== undefined) {
			// Calculate the middle of the token for the connector
			const tokenValue = formatToken(selectedTp.token);
			const boxWidth = tokenValue.length + 2;
			const connectorPos = startPos + Math.floor(boxWidth / 2);

			// Build the description line: spaces up to connector, then ┌─Description
			const beforeConnector = " ".repeat(connectorPos - 1);
			const descLine = `${beforeConnector}┌─${selectedTp.description}`;
			lines.push({
				content: <text fg={markerColor}>{descLine}</text>,
			});

			// Build the vertical connector line
			const verticalLine = `${beforeConnector}│`;
			lines.push({
				content: <text fg={markerColor}>{verticalLine}</text>,
			});
		}
	}

	// Add the three lines of the command display with token colors
	const topBorderLineElement = buildBorderLineElement(
		tokenPositions,
		selectedIndex,
		mode,
		editingTokenIndex,
		markerColor,
		"top",
	);
	const contentLineElement = buildContentLineElement(
		tokenPositions,
		selectedIndex,
		mode,
		editingTokenIndex,
		editingValue,
		cursorPosition,
		onTokenChange,
		onExitEdit,
	);
	const bottomBorderLineElement = buildBorderLineElement(
		tokenPositions,
		selectedIndex,
		mode,
		editingTokenIndex,
		markerColor,
		"bottom",
	);

	lines.push(
		{ content: topBorderLineElement },
		{ content: contentLineElement },
		{ content: bottomBorderLineElement },
	);

	return lines;
}

function buildBorderLineElement(
	tokenPositions: TokenPosition[],
	selectedIndex: number,
	mode: VimMode,
	editingTokenIndex: number | null,
	markerColor: string,
	borderType: "top" | "bottom",
): ReactNode {
	const elements: ReactNode[] = [];

	for (let i = 0; i < tokenPositions.length; i++) {
		const tp = tokenPositions[i];
		if (!tp) continue;

		const value = formatToken(tp.token);
		const isSelected = i === selectedIndex;
		const isEditing = mode === "insert" && editingTokenIndex === i;
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
			const editingValue = tp.description || value;
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

		if (i < tokenPositions.length - 1) {
			elements.push(<text key={`space-${i}`}> </text>);
		}
	}

	return <box style={{ flexDirection: "row" }}>{elements}</box>;
}

function buildContentLineElement(
	tokenPositions: TokenPosition[],
	selectedIndex: number,
	mode: VimMode,
	editingTokenIndex: number | null,
	editingValue: string,
	cursorPosition: number,
	onTokenChange: (value: string) => void,
	onExitEdit: (save: boolean) => void,
): ReactNode {
	const elements: ReactNode[] = [];

	for (let i = 0; i < tokenPositions.length; i++) {
		const tp = tokenPositions[i];
		if (!tp) continue;

		const value = formatToken(tp.token);
		const isSelected = i === selectedIndex;
		const isEditing = mode === "insert" && editingTokenIndex === i;
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

		if (i < tokenPositions.length - 1) {
			elements.push(<text key={`space-${i}`}> </text>);
		}
	}

	return <box style={{ flexDirection: "row" }}>{elements}</box>;
}
