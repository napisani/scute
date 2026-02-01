import { useState } from "react";

interface TokenEditorProps {
	value: string;
	cursorPosition: number;
	color: string;
	onChange: (value: string) => void;
	onExit: (save: boolean) => void;
}

export function TokenEditor({
	value,
	cursorPosition,
	color,
	onChange,
	onExit,
}: TokenEditorProps) {
	const [localValue, setLocalValue] = useState(value);

	return (
		<input
			value={localValue}
			onChange={(newValue) => {
				setLocalValue(newValue);
				onChange(newValue);
			}}
			focused
			width={Math.max(localValue.length + 2, 10)}
			textColor={color}
			cursorColor="#FFFFFF"
			backgroundColor="transparent"
		/>
	);
}
