import type { InputRenderable } from "@opentui/core";
import { useEffect, useRef } from "react";
import { getThemeColorFor } from "../config";

interface TokenEditorProps {
	value: string;
	cursorPosition: number;
	color: string;
	onChange: (value: string) => void;
}

export function TokenEditor({
	value,
	cursorPosition,
	color,
	onChange,
}: TokenEditorProps) {
	const inputRef = useRef<InputRenderable | null>(null);

	useEffect(() => {
		const input = inputRef.current;
		if (!input) {
			return;
		}
		const clampedCursor = Math.max(0, Math.min(cursorPosition, value.length));
		input.cursorOffset = clampedCursor;
		if (input.value !== value) {
			input.value = value;
		}
	}, [cursorPosition, value]);

	return (
		<input
			ref={inputRef}
			value={value}
			onChange={(newValue) => {
				onChange(newValue);
			}}
			focused
			width={Math.max(value.length + 2, 10)}
			textColor={color}
			cursorColor={getThemeColorFor("cursorColor")}
			backgroundColor="transparent"
		/>
	);
}
