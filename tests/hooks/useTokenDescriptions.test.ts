import { afterEach, describe, expect, it, vi } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { JSDOM } from "jsdom";
import * as core from "../../src/core";
import { tokenizeInput } from "../../src/core/shells";
import type { ParsedCommand } from "../../src/core/shells/common";
import { useTokenDescriptions } from "../../src/hooks/useTokenDescriptions";

const command: ParsedCommand = {
	originalCommand: "echo hello",
	tokens: tokenizeInput("echo hello"),
};

const descriptionsResponse = ["command description", "argument description"];

describe("useTokenDescriptions", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("resets all descriptions when resetDescriptions is called", async () => {
		vi.spyOn(core, "fetchTokenDescriptions").mockResolvedValue(
			descriptionsResponse,
		);

		const { result } = renderHook(() =>
			useTokenDescriptions({
				command,
				tokenCount: command.tokens.length,
			}),
		);

		await act(async () => {
			await result.current.loadDescriptions();
		});

		expect(result.current.descriptions).toEqual(descriptionsResponse);

		act(() => {
			result.current.resetDescriptions();
		});

		expect(result.current.descriptions).toEqual([]);
	});

	it("clears affected entries when invalidateDescriptions is used", async () => {
		vi.spyOn(core, "fetchTokenDescriptions").mockResolvedValue(
			descriptionsResponse,
		);

		const { result } = renderHook(() =>
			useTokenDescriptions({
				command,
				tokenCount: command.tokens.length,
			}),
		);

		await act(async () => {
			await result.current.loadDescriptions();
		});

		expect(result.current.descriptions).toEqual(descriptionsResponse);

		act(() => {
			result.current.invalidateDescriptions(1, 1);
		});

		expect(result.current.descriptions[0]).toBe(descriptionsResponse[0]);
		expect(result.current.descriptions[1]).toBe("");
	});
});
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
global.document = dom.window.document;
global.window = dom.window as unknown as Window & typeof globalThis;
