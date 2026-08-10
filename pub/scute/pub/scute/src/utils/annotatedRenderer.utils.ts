import type { TokenPosition } from "./tokenPositions";

// ---------------------------------------------------------------------------
// Row building and position calculation
// ---------------------------------------------------------------------------

export function buildTokenRows(
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

export function buildTokenStartPositions(
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

export function getTokenDisplayWidth(
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

export function getTokenValueLength(
	token: TokenPosition,
	editingTokenIndex: number | null,
	editingValue: string,
): number {
	if (editingTokenIndex === token.index) {
		return editingValue.length;
	}
	return token.token.value.length;
}

// ---------------------------------------------------------------------------
// Connector line builders (imperative — no OpenTUI equivalent)
// ---------------------------------------------------------------------------

export function buildConnectorStemLine(width: number, center: number): string {
	const line = new Array(width).fill(" ");
	if (center >= 0 && center < width) {
		line[center] = "│";
	}
	return line.join("");
}

export function buildConnectorLine(
	width: number,
	from: number,
	to: number,
): string {
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

// ---------------------------------------------------------------------------
// Text wrapping utility
// ---------------------------------------------------------------------------

export function wrapText(value: string, maxWidth: number): string[] {
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
