import { getThemeColorFor } from "../config";

interface SuggestInputProps {
	value: string;
	onChange: (value: string) => void;
	title?: string;
}

export function SuggestInput({
	value,
	onChange,
	title = "Suggest",
}: SuggestInputProps) {
	const cursorColor = getThemeColorFor("cursorColor");

	return (
		<box
			border
			borderStyle="rounded"
			borderColor={getThemeColorFor("hintLabelColor")}
			title={title}
			titleAlignment="left"
			width="100%"
			paddingLeft={1}
			paddingRight={1}
		>
			<input
				value={value}
				onInput={onChange}
				focused
				width="100%"
				cursorColor={cursorColor}
				backgroundColor="transparent"
			/>
		</box>
	);
}
