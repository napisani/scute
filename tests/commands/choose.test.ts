import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { runBuiltinMenu } from "../../src/commands/choose/menu";
import { CHOICES } from "../../src/commands/choose/types";

// Suppress stderr output (menu rendering) during tests
let stderrSpy: ReturnType<typeof spyOn>;

beforeEach(() => {
	stderrSpy = spyOn(process.stderr, "write").mockImplementation(() => true);
});

afterEach(() => {
	stderrSpy.mockRestore();
});

const KEY_DOWN = "\x1b[B";
const KEY_UP = "\x1b[A";
const KEY_ENTER = "\r";

/**
 * Build a mock readKeypress that yields keys from a sequence one at a time.
 */
function mockReadKeypress(keys: string[]): () => Promise<string> {
	let index = 0;
	return () => {
		const key = keys[index++];
		if (key === undefined) {
			throw new Error("readKeypress called more times than expected");
		}
		return Promise.resolve(key);
	};
}

describe("runBuiltinMenu", () => {
	it("navigates down to bottom, back up to top, and selects first item with Enter", async () => {
		// 4 items total (indices 0–3)
		// Down x3: 0→1→2→3 (at last item)
		// Up x3:   3→2→1→0 (back at first item)
		// Enter:   select index 0
		const keys = [
			KEY_DOWN,
			KEY_DOWN,
			KEY_DOWN,
			KEY_UP,
			KEY_UP,
			KEY_UP,
			KEY_ENTER,
		];

		const result = await runBuiltinMenu({
			readKeypress: mockReadKeypress(keys),
		});

		expect(result).toBe(CHOICES[0]!.action);
		expect(result).toBe("explain");
	});

	it("selects via letter shortcut immediately", async () => {
		const result = await runBuiltinMenu({
			readKeypress: mockReadKeypress(["s"]),
		});

		expect(result).toBe("suggest");
	});

	it("returns null on q cancel", async () => {
		const result = await runBuiltinMenu({
			readKeypress: mockReadKeypress(["q"]),
		});

		expect(result).toBeNull();
	});

	it("returns null on Esc cancel", async () => {
		const result = await runBuiltinMenu({
			readKeypress: mockReadKeypress(["\x1b"]),
		});

		expect(result).toBeNull();
	});

	it("navigates with vim keys j/k", async () => {
		// j x2: 0→1→2 (Suggest), then Enter
		const keys = ["j", "j", KEY_ENTER];

		const result = await runBuiltinMenu({
			readKeypress: mockReadKeypress(keys),
		});

		expect(result).toBe("suggest");
	});

	it("wraps around when navigating past the last item", async () => {
		// 4 items: down x4 wraps back to index 0, then Enter
		const keys = [KEY_DOWN, KEY_DOWN, KEY_DOWN, KEY_DOWN, KEY_ENTER];

		const result = await runBuiltinMenu({
			readKeypress: mockReadKeypress(keys),
		});

		expect(result).toBe("explain");
	});

	it("wraps around when navigating before the first item", async () => {
		// At index 0, up wraps to last item (index 3), then Enter
		const keys = [KEY_UP, KEY_ENTER];

		const result = await runBuiltinMenu({
			readKeypress: mockReadKeypress(keys),
		});

		expect(result).toBe(CHOICES[CHOICES.length - 1]!.action);
		expect(result).toBe("generate");
	});

	it("ignores unknown keys and continues until a selection is made", async () => {
		// x, z are unknown — ignored. Then Enter selects index 0.
		const keys = ["x", "z", KEY_ENTER];

		const result = await runBuiltinMenu({
			readKeypress: mockReadKeypress(keys),
		});

		expect(result).toBe("explain");
	});
});
