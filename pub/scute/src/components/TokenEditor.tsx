import { getThemeColorFor } from "../config";

interface TokenEditorProps {
	value: string;
	color: string;
	onChange: (value: string) => void;
}

export function TokenEditor({ value, color, onChange }: TokenEditorProps) {
	return (
		<input
			value={value}
			onInput={(newValue) => {
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
