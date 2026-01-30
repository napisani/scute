import { formatToken } from "./tokenFormatters";
import type { TokenPosition } from "./tokenPositions";

export function renderAnnotatedCommand(
	tokenPositions: TokenPosition[],
	selectedIndex: number,
): string[] {
	if (tokenPositions.length === 0) return [];

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

	// Build the content line (second line with actual token values)
	let contentLine = "";
	for (let i = 0; i < tokenPositions.length; i++) {
		const tp = tokenPositions[i];
		if (!tp) continue;

		const value = formatToken(tp.token);
		const isSelected = i === selectedIndex;

		if (isSelected) {
			contentLine += `│${value}│`;
		} else {
			contentLine += ` ${value} `;
		}

		if (i < tokenPositions.length - 1) {
			contentLine += " ";
		}
	}

	// Build the bottom border line for selected token
	let bottomBorderLine = "";
	for (let i = 0; i < tokenPositions.length; i++) {
		const tp = tokenPositions[i];
		if (!tp) continue;

		const value = formatToken(tp.token);
		const isSelected = i === selectedIndex;

		if (isSelected) {
			bottomBorderLine += `└${"─".repeat(value.length)}┘`;
		} else {
			bottomBorderLine += ` ${" ".repeat(value.length)} `;
		}

		if (i < tokenPositions.length - 1) {
			bottomBorderLine += " ";
		}
	}

	const lines: string[] = [];

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
			lines.push(descLine);

			// Build the vertical connector line
			const verticalLine = `${beforeConnector}│`;
			lines.push(verticalLine);
		}
	}

	// Add the three lines of the command display
	lines.push(commandLine); // Top borders
	lines.push(contentLine); // Token values
	lines.push(bottomBorderLine); // Bottom borders

	return lines;
}
