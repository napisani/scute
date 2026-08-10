export interface KeyboardKey {
	name: string;
	sequence?: string;
	ctrl?: boolean;
	meta?: boolean;
	shift?: boolean;
	option?: boolean;
	alt?: boolean;
	preventDefault?: () => void;
}

export type KeyboardHandler = (key: KeyboardKey) => void;

export function hasModifierKey(key: KeyboardKey): boolean {
	return Boolean(key.ctrl || key.meta || key.option || key.alt);
}

export function normalizeKeyId(key: KeyboardKey): string {
	const sequence = key.sequence;
	if (sequence === "\r" || sequence === "\n") {
		return "return";
	}
	if (sequence === " ") {
		return "space";
	}
	if (sequence) {
		return sequence;
	}
	if (key.name === "enter") {
		return "return";
	}
	if (key.shift && key.name.length === 1) {
		return key.name.toUpperCase();
	}
	return key.name;
}
