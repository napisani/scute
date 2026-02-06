import type { ShellKeybindingAction } from "../../config/schema";

export type ShellKeybindings = Record<ShellKeybindingAction, string[]>;

export type ParsedKeybinding = {
	key: string;
	modifiers: {
		ctrl: boolean;
		shift: boolean;
		alt: boolean;
		meta: boolean;
	};
};

export function parseKeybinding(value: string): ParsedKeybinding | null {
	const parts = value
		.split("+")
		.map((part) => part.trim())
		.filter((part) => part.length > 0);
	if (!parts.length) return null;

	const modifiers = {
		ctrl: false,
		shift: false,
		alt: false,
		meta: false,
	};
	let key: string | null = null;

	for (const part of parts) {
		const normalized = part.toLowerCase();
		if (normalized === "ctrl" || normalized === "control") {
			modifiers.ctrl = true;
			continue;
		}
		if (normalized === "shift") {
			modifiers.shift = true;
			continue;
		}
		if (normalized === "alt" || normalized === "option") {
			modifiers.alt = true;
			continue;
		}
		if (
			normalized === "meta" ||
			normalized === "cmd" ||
			normalized === "command"
		) {
			modifiers.meta = true;
			continue;
		}
		if (key) {
			return null;
		}
		key = part;
	}

	if (!key) return null;
	return { key, modifiers };
}

export function normalizeKey(key: string, shift: boolean): string | null {
	const trimmed = key.trim();
	if (!trimmed) return null;
	const normalized = trimmed.toLowerCase();
	if (normalized === "space") return " ";
	if (normalized.length !== 1) return null;
	return shift ? normalized.toUpperCase() : normalized;
}

export function toReadlineSequence(binding: ParsedKeybinding): string | null {
	const key = normalizeKey(binding.key, binding.modifiers.shift);
	if (!key) return null;
	let sequence = key;
	if (binding.modifiers.ctrl) {
		sequence = key === " " ? "\\C-@" : `\\C-${key}`;
	}
	if (binding.modifiers.alt || binding.modifiers.meta) {
		sequence = `\\M-${sequence}`;
	}
	return sequence;
}

export function toZshSequence(binding: ParsedKeybinding): string | null {
	const key = normalizeKey(binding.key, binding.modifiers.shift);
	if (!key) return null;
	let sequence = key;
	if (binding.modifiers.ctrl) {
		sequence = key === " " ? "^@" : `^${key.toUpperCase()}`;
	}
	if (binding.modifiers.alt || binding.modifiers.meta) {
		sequence = `^[${sequence}`;
	}
	return sequence;
}
