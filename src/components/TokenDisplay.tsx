import type { ColoredToken } from "../hooks/useColoredTokens";
import { TokenEditor } from "./TokenEditor";

interface TokenDisplayProps {
	token: ColoredToken;
	isEditing: boolean;
	editValue: string;
	cursorPosition: number;
	onChange: (value: string) => void;
}

export function TokenDisplay({
	token,
	isEditing,
	editValue,
	cursorPosition,
	onChange,
}: TokenDisplayProps) {
	const { token: tokenData, color } = token;
	const displayValue = tokenData.value;

	if (isEditing) {
		return (
			<TokenEditor
				value={editValue}
				cursorPosition={cursorPosition}
				color={color}
				onChange={onChange}
			/>
		);
	}

	return <text fg={color}>{displayValue}</text>;
}
