import { getChooseMenuColors } from "../../config";
import type { ChooseMenuColorsConfig } from "../../config/schema";
import { type ActionChoice, CHOICES } from "./types";

// ── Color helpers ───────────────────────────────────────────────────────────

/**
 * Convert a hex color string (#RRGGBB) to an "R;G;B" string
 * for use in truecolor ANSI escape sequences.
 */
function hexToRgb(hex: string): string {
	const h = hex.replace("#", "");
	const r = Number.parseInt(h.slice(0, 2), 16);
	const g = Number.parseInt(h.slice(2, 4), 16);
	const b = Number.parseInt(h.slice(4, 6), 16);
	return `${r};${g};${b}`;
}

/** Foreground color from hex */
function fg(hex: string): string {
	return `\x1b[38;2;${hexToRgb(hex)}m`;
}

/** Background color from hex */
function bg(hex: string): string {
	return `\x1b[48;2;${hexToRgb(hex)}m`;
}

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

// ── Menu geometry ───────────────────────────────────────────────────────────

/** Visible width of the menu box interior (excluding border chars). */
const INNER_WIDTH = 50;

const ESC = "\x1b";
const ANSI_RE = new RegExp(`${ESC}\\[[0-9;]*m`, "g");

function stripAnsi(text: string): string {
	return text.replace(ANSI_RE, "");
}

function pad(text: string, width: number): string {
	const len = stripAnsi(text).length;
	return text + " ".repeat(Math.max(0, width - len));
}

// ── Box drawing ─────────────────────────────────────────────────────────────

function renderTopBorder(c: ChooseMenuColorsConfig, title: string): string {
	const titleText = ` ${title} `;
	const remaining = INNER_WIDTH - titleText.length - 1; // -1 for left segment
	return (
		`${fg(c.border)}┌─${RESET}` +
		`${BOLD}${fg(c.title)}${titleText}${RESET}` +
		`${fg(c.border)}${"─".repeat(Math.max(0, remaining))}┐${RESET}`
	);
}

function renderBottomBorder(c: ChooseMenuColorsConfig): string {
	return `${fg(c.border)}└${"─".repeat(INNER_WIDTH)}┘${RESET}`;
}

function renderEmptyLine(c: ChooseMenuColorsConfig): string {
	return `${fg(c.border)}│${RESET}${" ".repeat(INNER_WIDTH)}${fg(c.border)}│${RESET}`;
}

function renderRow(c: ChooseMenuColorsConfig, content: string): string {
	return (
		`${fg(c.border)}│${RESET} ` +
		pad(content, INNER_WIDTH - 2) +
		` ${fg(c.border)}│${RESET}`
	);
}

// ── Choice row rendering ────────────────────────────────────────────────────

function renderChoiceRow(
	c: ChooseMenuColorsConfig,
	index: number,
	selectedIndex: number,
): string {
	const choice = CHOICES[index]!;
	const isSelected = index === selectedIndex;

	const pointer = isSelected ? `${fg(c.pointer)}${BOLD}>${RESET}` : " ";
	const key = `${fg(c.shortcutKey)}${BOLD}${choice.key}${RESET}`;
	const label = isSelected
		? `${fg(c.text)}${BOLD}${choice.label}${RESET}`
		: `${fg(c.text)}${choice.label}${RESET}`;
	const desc = `${DIM}${fg(c.description)}${choice.description}${RESET}`;

	const content = `${pointer} ${key}  ${label}  ${desc}`;

	if (isSelected) {
		// Highlighted row with background
		return (
			`${fg(c.border)}│${RESET}` +
			`${bg(c.highlightBg)} ` +
			pad(content, INNER_WIDTH - 2) +
			` ${RESET}${fg(c.border)}│${RESET}`
		);
	}

	return renderRow(c, content);
}

// ── Footer ──────────────────────────────────────────────────────────────────

function renderFooter(c: ChooseMenuColorsConfig): string {
	const nav =
		`${DIM}${fg(c.description)}` +
		`\u2191\u2193/jk navigate \u00b7 enter select \u00b7 q/esc cancel` +
		`${RESET}`;
	return renderRow(c, nav);
}

// ── Full menu render ────────────────────────────────────────────────────────

function renderMenu(c: ChooseMenuColorsConfig, selectedIndex: number): string {
	const lines: string[] = [];

	lines.push(renderTopBorder(c, "Scute"));
	lines.push(renderEmptyLine(c));
	for (let i = 0; i < CHOICES.length; i++) {
		lines.push(renderChoiceRow(c, i, selectedIndex));
	}
	lines.push(renderEmptyLine(c));
	lines.push(renderFooter(c));
	lines.push(renderBottomBorder(c));

	return lines.join("\n");
}

/** Total lines the menu occupies (for clearing). */
function menuLineCount(): number {
	// top border + empty + N choices + empty + footer + bottom border
	return 2 + CHOICES.length + 2 + 1;
}

// ── Terminal helpers ────────────────────────────────────────────────────────

/** Hide cursor */
function hideCursor(): void {
	process.stderr.write("\x1b[?25l");
}

/** Show cursor */
function showCursor(): void {
	process.stderr.write("\x1b[?25h");
}

/** Clear the menu from stderr. */
function clearMenu(): void {
	const lines = menuLineCount();
	// Move to start of current line, clear it, then move up and clear for each line
	let seq = "\r\x1b[K";
	for (let i = 0; i < lines - 1; i++) {
		seq += "\x1b[1A\x1b[K";
	}
	process.stderr.write(seq);
}

/** Write the menu to stderr. */
function drawMenu(c: ChooseMenuColorsConfig, selectedIndex: number): void {
	process.stderr.write(renderMenu(c, selectedIndex));
}

// ── Key parsing ─────────────────────────────────────────────────────────────

const KEY_UP = "\x1b[A";
const KEY_DOWN = "\x1b[B";
const KEY_ENTER = "\r";
const KEY_ESC = "\x1b";
const KEY_CTRL_C = "\x03";

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Read a single data event from stdin.
 * Assumes stdin is already in raw mode and resumed — does NOT
 * toggle raw mode or pause/unref between reads.
 */
function readKey(): Promise<string> {
	return new Promise<string>((resolve) => {
		process.stdin.once("data", (data: Buffer) => {
			resolve(data.toString());
		});
	});
}

export interface BuiltinMenuOptions {
	readKeypress?: () => Promise<string>;
}

/**
 * Show the built-in interactive menu on stderr.
 * Returns the selected action, or null if the user cancelled.
 */
export async function runBuiltinMenu(
	options: BuiltinMenuOptions = {},
): Promise<ActionChoice | null> {
	const usingCustomReader = options.readKeypress != null;
	const readKeypress = options.readKeypress ?? readKey;
	const stdin = process.stdin;
	const wasTTY = stdin.isTTY;
	const wasRaw = wasTTY ? stdin.isRaw : false;

	// Enter raw mode for the entire menu session (skip when using injected reader)
	if (!usingCustomReader) {
		if (wasTTY && !wasRaw) {
			stdin.setRawMode(true);
		}
		stdin.resume();
		stdin.ref();
	}

	const colors = getChooseMenuColors();
	let selectedIndex = 0;

	hideCursor();
	drawMenu(colors, selectedIndex);

	try {
		while (true) {
			const key = await readKeypress();

			// Letter shortcut — immediate select
			const shortcutMatch = CHOICES.findIndex((ch) => ch.key === key);
			if (shortcutMatch !== -1) {
				clearMenu();
				return CHOICES[shortcutMatch]!.action;
			}

			// Navigation
			if (key === KEY_UP || key === "k") {
				selectedIndex = (selectedIndex - 1 + CHOICES.length) % CHOICES.length;
			} else if (key === KEY_DOWN || key === "j") {
				selectedIndex = (selectedIndex + 1) % CHOICES.length;
			} else if (key === KEY_ENTER) {
				clearMenu();
				return CHOICES[selectedIndex]!.action;
			} else if (key === "q" || key === KEY_ESC || key === KEY_CTRL_C) {
				clearMenu();
				return null;
			} else {
				// Unknown key — ignore
				continue;
			}

			// Redraw with new selection
			clearMenu();
			drawMenu(colors, selectedIndex);
		}
	} finally {
		showCursor();
		// Restore stdin to its original state (skip when using injected reader)
		if (!usingCustomReader) {
			if (wasTTY && !wasRaw) {
				stdin.setRawMode(false);
			}
			stdin.pause();
			stdin.unref();
		}
	}
}
