import { describe, expect, it } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { JSDOM } from "jsdom";
import { useAsyncAction } from "../../src/hooks/useAsyncAction";

// Set up JSDOM before importing React
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
global.document = dom.window.document;
const domWindow: unknown = dom.window;
// SAFETY: jsdom's Window is a structural superset of the DOM globals the React
// testing utilities expect; this is the standard jsdom-in-Node bootstrap used to
// give hook tests a browser-like global scope.
global.window = domWindow as Window & typeof globalThis;

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((res) => {
		resolve = res;
	});
	return { promise, resolve };
}

describe("useAsyncAction", () => {
	it("sets isLoading while in flight and clears it on success", async () => {
		const { result } = renderHook(() => useAsyncAction<string>("failed"));
		const { promise, resolve } = deferred<string>();
		let success: string | undefined;

		act(() => {
			result.current.run(() => promise, {
				onSuccess: (value) => {
					success = value;
				},
			});
		});

		expect(result.current.isLoading).toBe(true);
		expect(result.current.error).toBeNull();

		await act(async () => {
			resolve("ok");
			await promise;
		});

		expect(result.current.isLoading).toBe(false);
		expect(result.current.error).toBeNull();
		expect(success).toBe("ok");
	});

	it("sets error and calls onError when the action resolves falsy", async () => {
		const { result } = renderHook(() => useAsyncAction<string>("default failed"));
		let errorSeen: string | undefined;

		await act(async () => {
			result.current.run(() => Promise.resolve(null), {
				onSuccess: () => {
					throw new Error("onSuccess should not be called");
				},
				onError: (message) => {
					errorSeen = message;
				},
				emptyResultMessage: "nothing came back",
			});
		});

		expect(result.current.isLoading).toBe(false);
		expect(result.current.error).toBe("nothing came back");
		expect(errorSeen).toBe("nothing came back");
	});

	it("sets the default error message when the action throws", async () => {
		const { result } = renderHook(() => useAsyncAction<string>("default failed"));

		await act(async () => {
			result.current.run(
				() => Promise.reject(new Error("network down")),
				{ onSuccess: () => {} },
			);
		});

		expect(result.current.isLoading).toBe(false);
		expect(result.current.error).toBe("default failed");
	});

	it("discards a stale response once a newer run supersedes it", async () => {
		const { result } = renderHook(() => useAsyncAction<string>("failed"));
		const first = deferred<string>();
		const second = deferred<string>();
		const successes: string[] = [];

		act(() => {
			result.current.run(() => first.promise, {
				onSuccess: (value) => successes.push(value),
			});
		});
		act(() => {
			result.current.run(() => second.promise, {
				onSuccess: (value) => successes.push(value),
			});
		});

		await act(async () => {
			// Resolve the newer call first, then the stale one — the stale
			// resolution must not be able to overwrite state or fire its callback.
			second.resolve("second");
			await second.promise;
			first.resolve("first");
			await first.promise;
		});

		expect(successes).toEqual(["second"]);
		expect(result.current.isLoading).toBe(false);
		expect(result.current.error).toBeNull();
	});

	it("reset() discards an in-flight call's eventual resolution", async () => {
		const { result } = renderHook(() => useAsyncAction<string>("failed"));
		const { promise, resolve } = deferred<string>();
		let successCalled = false;

		act(() => {
			result.current.run(() => promise, {
				onSuccess: () => {
					successCalled = true;
				},
			});
		});

		act(() => {
			result.current.reset();
		});

		expect(result.current.isLoading).toBe(false);
		expect(result.current.error).toBeNull();

		await act(async () => {
			resolve("late");
			await promise;
		});

		expect(successCalled).toBe(false);
		expect(result.current.isLoading).toBe(false);
	});
});
