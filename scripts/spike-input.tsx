/**
 * Spike: Verify OpenTUI <input> behavior for the simplification plan.
 *
 * This spike programmatically sends keystrokes via a timer and logs
 * what happens, so it can run non-interactively.
 *
 * Run: bun run scripts/spike-input.tsx
 *
 * Test sequence:
 * 1. Press 'i' → enter insert mode → verify 'i' does NOT appear in input value
 * 2. Type "hello" → verify onInput fires with accumulated value
 * 3. Press Escape → verify useKeyboard intercepts it (mode goes back to normal)
 * 4. Press 'i' again → type "world" → press Enter → verify useKeyboard intercepts it
 * 5. Quit
 */

import { createCliRenderer } from "@opentui/core";
import { createRoot, useKeyboard } from "@opentui/react";
import { useCallback, useEffect, useRef, useState } from "react";

type Mode = "normal" | "insert";

interface TestResult {
	test: string;
	passed: boolean;
	detail: string;
}

function App({ onResults }: { onResults: (results: TestResult[]) => void }) {
	const [mode, setMode] = useState<Mode>("normal");
	const [inputValue, setInputValue] = useState("");
	const inputValueRef = useRef(inputValue);
	inputValueRef.current = inputValue;
	const modeRef = useRef(mode);
	modeRef.current = mode;

	const results = useRef<TestResult[]>([]);
	const stepRef = useRef(0);

	const addResult = useCallback(
		(test: string, passed: boolean, detail: string) => {
			results.current.push({ test, passed, detail });
		},
		[],
	);

	// Global keyboard handler — fires BEFORE focused <input>
	useKeyboard((key) => {
		const currentMode = modeRef.current;

		if (currentMode === "normal") {
			if (key.name === "q") {
				onResults(results.current);
				return;
			}
			if (key.sequence === "i") {
				setInputValue("");
				setMode("insert");
				return;
			}
			return;
		}

		if (currentMode === "insert") {
			if (key.name === "escape") {
				key.preventDefault();
				setMode("normal");
				return;
			}
			if (key.name === "return" || key.sequence === "\r") {
				key.preventDefault();
				setMode("normal");
				return;
			}
		}
	});

	const handleInput = useCallback((value: string) => {
		setInputValue(value);
	}, []);

	// Programmatic test sequence using the renderer's key input
	useEffect(() => {
		const renderer = (globalThis as any).__spikeRenderer;
		if (!renderer) return;

		const keyHandler = renderer.keyInput;
		if (!keyHandler) return;

		function sendKey(
			name: string,
			sequence?: string,
			opts?: Record<string, boolean>,
		) {
			const event = {
				name,
				sequence: sequence ?? name,
				ctrl: false,
				meta: false,
				shift: false,
				option: false,
				alt: false,
				eventType: "press",
				repeated: false,
				defaultPrevented: false,
				propagationStopped: false,
				preventDefault() {
					this.defaultPrevented = true;
				},
				stopPropagation() {
					this.propagationStopped = true;
				},
				...opts,
			};
			keyHandler.emitWithPriority("keypress", event);
		}

		function sendChar(char: string) {
			sendKey(char, char);
		}

		function sendString(str: string) {
			for (const ch of str) {
				sendChar(ch);
			}
		}

		// Run test sequence with small delays to allow React to render between steps
		const steps = [
			// Step 1: Press 'i' to enter insert mode
			() => {
				sendChar("i");
			},
			// Step 2: Check mode changed and 'i' did NOT leak
			() => {
				const leaked = inputValueRef.current;
				addResult(
					"Trigger key does not leak into <input>",
					leaked === "",
					`inputValue after 'i': "${leaked}" (expected "")`,
				);
				addResult(
					"Mode changed to insert",
					modeRef.current === "insert",
					`mode: "${modeRef.current}" (expected "insert")`,
				);
			},
			// Step 3: Type "hello"
			() => {
				sendString("hello");
			},
			// Step 4: Verify value
			() => {
				addResult(
					"Typing works via <input> onInput",
					inputValueRef.current === "hello",
					`inputValue: "${inputValueRef.current}" (expected "hello")`,
				);
			},
			// Step 5: Press Escape
			() => {
				sendKey("escape", "\u001b");
			},
			// Step 6: Verify Escape was intercepted
			() => {
				addResult(
					"Escape intercepted by useKeyboard (preventDefault)",
					modeRef.current === "normal",
					`mode: "${modeRef.current}" (expected "normal")`,
				);
			},
			// Step 7: Press 'i' again, type "world"
			() => {
				sendChar("i");
			},
			() => {
				sendString("world");
			},
			// Step 8: Verify value
			() => {
				addResult(
					"Second insert session works",
					inputValueRef.current === "world",
					`inputValue: "${inputValueRef.current}" (expected "world")`,
				);
			},
			// Step 9: Press Enter
			() => {
				sendKey("return", "\r");
			},
			// Step 10: Verify Enter was intercepted
			() => {
				addResult(
					"Enter intercepted by useKeyboard (preventDefault)",
					modeRef.current === "normal",
					`mode: "${modeRef.current}" (expected "normal")`,
				);
			},
			// Step 11: Quit
			() => {
				sendChar("q");
			},
		];

		let i = 0;
		const timer = setInterval(() => {
			if (i >= steps.length) {
				clearInterval(timer);
				return;
			}
			steps[i]?.();
			i++;
		}, 50);

		return () => clearInterval(timer);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [addResult]);

	return (
		<box flexDirection="column" width="100%" height="100%" padding={1}>
			<text fg="#CBA6F7">
				<strong>Spike: running tests...</strong>
			</text>
			<box marginTop={1}>
				<text fg={mode === "insert" ? "#A6E3A1" : "#6C7086"}>
					{mode === "insert" ? "-- INSERT --" : "-- NORMAL --"}
				</text>
			</box>
			<box
				marginTop={1}
				border
				borderStyle="rounded"
				borderColor="#585B70"
				paddingLeft={1}
				paddingRight={1}
			>
				{mode === "insert" ? (
					<input
						value={inputValue}
						onInput={handleInput}
						focused
						width={40}
						textColor="#CDD6F4"
						cursorColor="#F5E0DC"
						backgroundColor="transparent"
					/>
				) : (
					<text fg="#6C7086">{"(normal mode)"}</text>
				)}
			</box>
		</box>
	);
}

async function main() {
	// Safety timeout — kill the process if tests don't finish in 10s
	setTimeout(() => {
		const fs = require("node:fs");
		fs.writeFileSync(
			"/tmp/spike-input-results.txt",
			"TIMEOUT: tests did not complete in 10s\n",
		);
		process.exit(2);
	}, 10000).unref();

	const renderer = await createCliRenderer();
	(globalThis as any).__spikeRenderer = renderer;

	let exitCode = 0;

	const handleResults = (results: TestResult[]) => {
		renderer.destroy();

		const lines: string[] = [];
		lines.push("=== Spike Results ===");
		for (const r of results) {
			const icon = r.passed ? "PASS" : "FAIL";
			lines.push(`  [${icon}] ${r.test}`);
			lines.push(`         ${r.detail}`);
		}

		const passed = results.filter((r) => r.passed).length;
		const total = results.length;
		lines.push(`\n  ${passed}/${total} passed`);

		if (passed < total) {
			exitCode = 1;
		}

		// Write results to a file since stdout has ANSI from the TUI
		const fs = require("node:fs");
		fs.writeFileSync("/tmp/spike-input-results.txt", lines.join("\n") + "\n");
		setTimeout(() => process.exit(exitCode), 100);
	};

	const root = createRoot(renderer);
	root.render(<App onResults={handleResults} />);
}

main();
