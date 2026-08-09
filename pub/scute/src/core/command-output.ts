function stripAnsiSequences(text: string): string {
	let output = "";
	for (let i = 0; i < text.length; i += 1) {
		const char = text[i];
		if (char !== "\u001b") {
			output += char;
			continue;
		}
		const next = text[i + 1];
		if (next === "[") {
			i += 1;
			while (i + 1 < text.length) {
				i += 1;
				const code = text.charCodeAt(i);
				if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
					break;
				}
			}
			continue;
		}
		if (next === "]") {
			i += 1;
			while (i + 1 < text.length) {
				i += 1;
				if (text.charCodeAt(i) === 7) {
					break;
				}
			}
		}
	}
	return output;
}

function stripControlCharacters(text: string): string {
	const normalized = text.replace(/\r\n?/g, "\n");
	let output = "";
	for (let i = 0; i < normalized.length; i += 1) {
		const code = normalized.charCodeAt(i);
		if (
			(code >= 0 && code <= 8) ||
			code === 11 ||
			code === 12 ||
			(code >= 14 && code <= 31) ||
			code === 127
		) {
			continue;
		}
		output += normalized[i];
	}
	return output;
}

function extractFencedContent(text: string): string {
	const fenceMatch = text.match(/```[a-zA-Z0-9_-]*\n([\s\S]*?)```/);
	if (fenceMatch?.[1]) {
		return fenceMatch[1];
	}
	return text;
}

function stripLinePrefix(line: string): string {
	const trimmed = line.trim();
	const labelMatch = trimmed.match(
		/^(command|cmd|suggestion|answer)\s*:\s*(.*)$/i,
	);
	if (labelMatch?.[2]) {
		return labelMatch[2].trim();
	}
	if (trimmed.startsWith("$ ") || trimmed.startsWith("> ")) {
		return trimmed.slice(2).trimStart();
	}
	if (trimmed.startsWith("# ")) {
		return trimmed.slice(2).trimStart();
	}
	return trimmed;
}

function isLabelLine(line: string): boolean {
	return /:$/.test(line.trim());
}

function stripWrappingBackticks(line: string): string {
	const trimmed = line.trim();
	if (/^`[^`]+`$/.test(trimmed)) {
		return trimmed.slice(1, -1).trim();
	}
	return trimmed;
}

function pickCommandLine(lines: string[]): string {
	for (let i = 0; i < lines.length; i += 1) {
		const line = lines[i];
		if (!line) continue;
		const trimmed = line.trim();
		if (!trimmed) continue;
		if (trimmed.startsWith("```")) continue;
		if (isLabelLine(trimmed)) continue;
		const normalized = stripWrappingBackticks(stripLinePrefix(trimmed));
		if (normalized) {
			return normalized;
		}
	}
	return "";
}

function normalizeCommandLine(line: string): string {
	return line.replace(/\t/g, " ").trim();
}

export function sanitizeCommandOutput(text: string): string | null {
	if (!text) return null;
	const withoutAnsi = stripAnsiSequences(text);
	const withoutControl = stripControlCharacters(withoutAnsi);
	const content = extractFencedContent(withoutControl);
	const lines = content.split("\n");
	const picked = pickCommandLine(lines);
	const normalized = normalizeCommandLine(picked);
	return normalized.length ? normalized : null;
}
