import { describe, expect, it } from "bun:test";
import { resolveBuildCommand } from "../src/commands/build";
import {
	emptyDraftInitialState,
	processEmptyDraftKey,
} from "../src/pages/build";
import type { KeyboardKey } from "../src/utils/keyboard";

function makeKey(
	partial: Partial<KeyboardKey> & { name: string },
): KeyboardKey {
	return {
		name: partial.name,
		sequence: partial.sequence,
		ctrl: partial.ctrl,
		meta: partial.meta,
		shift: partial.shift,
		option: partial.option,
		alt: partial.alt,
	};
}

describe("resolveBuildCommand", () => {
	it("prefers positional arguments when provided", () => {
		const result = resolveBuildCommand(["git", "status"], {
			hasReadlineLine: true,
			readlineLine: "echo hello",
		});
		expect(result).toBe("git status");
	});

	it("falls back to readline when positional args missing", () => {
		const result = resolveBuildCommand([], {
			hasReadlineLine: true,
			readlineLine: "npm run build",
		});
		expect(result).toBe("npm run build");
	});

	it("returns empty string when no inputs available", () => {
		const result = resolveBuildCommand([], {
			hasReadlineLine: false,
			readlineLine: null,
		});
		expect(result).toBe("");
	});
});

describe("processEmptyDraftKey", () => {
	it("builds up draft text and submits on enter", () => {
		let state = emptyDraftInitialState;
		let result = processEmptyDraftKey(
			state,
			makeKey({ name: "l", sequence: "l" }),
		);
		state = result.state;
		expect(state.value).toBe("l");
		expect(state.cursor).toBe(1);

		result = processEmptyDraftKey(state, makeKey({ name: "s", sequence: "s" }));
		state = result.state;
		expect(state.value).toBe("ls");
		expect(state.cursor).toBe(2);

		result = processEmptyDraftKey(state, makeKey({ name: "left" }));
		state = result.state;
		expect(state.cursor).toBe(1);

		result = processEmptyDraftKey(state, makeKey({ name: "backspace" }));
		state = result.state;
		expect(state.value).toBe("s");
		expect(state.cursor).toBe(0);

		result = processEmptyDraftKey(
			state,
			makeKey({ name: "enter", sequence: "\r" }),
		);
		expect(result.submittedValue).toBe("s");
	});

	it("ignores submission when draft is empty", () => {
		const result = processEmptyDraftKey(
			emptyDraftInitialState,
			makeKey({
				name: "enter",
				sequence: "\r",
			}),
		);
		expect(result.submittedValue).toBeNull();
		expect(result.state).toEqual(emptyDraftInitialState);
	});

	it("ignores keys with modifiers", () => {
		const result = processEmptyDraftKey(
			emptyDraftInitialState,
			makeKey({
				name: "x",
				sequence: "x",
				ctrl: true,
			}),
		);
		expect(result.state).toEqual(emptyDraftInitialState);
		expect(result.submittedValue).toBeNull();
	});
});
