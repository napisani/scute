import type { ColoredToken } from "../hooks/useColoredTokens";
import { formatToken } from "../utils/tokenFormatters";
import { TokenEditor } from "./TokenEditor";

interface TokenDisplayProps {
	token: ColoredToken;
	isEditing: boolean;
	editValue: string;
	cursorPosition: number;
	onChange: (value: string) => void;
	onExit: (save: boolean) => void;
}

export function TokenDisplay({
	token,
	isEditing,
	editValue,
	cursorPosition,
	onChange,
	onExit,
}: TokenDisplayProps) {
	const { token: tokenData, color } = token;
	const displayValue = formatToken(tokenData);

	if (isEditing) {
		return (
			<TokenEditor
				value={editValue}
				cursorPosition={cursorPosition}
				color={color}
				onChange={onChange}
				onExit={onExit}
			/>
		);
	}

	return <text fg={color}>{displayValue}</text>;
}
