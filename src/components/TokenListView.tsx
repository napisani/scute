import { getThemeColorFor } from "../config";
import type { ColoredToken } from "../hooks/useColoredTokens";
import type { TokenWidths } from "../hooks/useTokenWidth";
import type { VimMode } from "../hooks/useVimMode";
import { formatToken, formatTokenType } from "../utils/tokenFormatters";
import { TokenDisplay } from "./TokenDisplay";

interface TokenListViewProps {
	coloredTokens: ColoredToken[];
	descriptions: string[];
	tokenWidths: TokenWidths;
	mode: VimMode;
	editingTokenIndex: number | null;
	editingValue: string;
	cursorPosition: number;
	onTokenChange: (value: string) => void;
	onExitEdit: (save: boolean) => void;
}

export function TokenListView({
	coloredTokens,
	descriptions,
	tokenWidths,
	mode,
	editingTokenIndex,
	editingValue,
	cursorPosition,
	onTokenChange,
	onExitEdit,
}: TokenListViewProps) {
	const { typeWidth, tokenWidth } = tokenWidths;
	const descriptionColor = getThemeColorFor("tokenDescription");

	return (
		<box width="100%" height="100%" justifyContent="center" alignItems="center">
			<scrollbox height="100%">
				{coloredTokens.map((coloredToken) => {
					const { token, index, color, isSelected } = coloredToken;
					const description = descriptions[index] ?? "";
					const label = formatToken(token);
					const typeLabel = formatTokenType(token);
					const key = `${token.type}-${label}-${index}`;
					const isEditing = mode === "insert" && editingTokenIndex === index;

					return (
						<box key={key} style={{ flexDirection: "row" }}>
							<text fg={color}>
								{isSelected ? "> " : "  "}
								{typeLabel.padEnd(typeWidth + 2, " ")}
							</text>
							<TokenDisplay
								token={coloredToken}
								isEditing={isEditing}
								editValue={editingValue}
								cursorPosition={cursorPosition}
								onChange={onTokenChange}
								onExit={onExitEdit}
							/>
							<text fg={color}>
								{" ".repeat(tokenWidth - label.length + 2)}
							</text>
							<text fg={descriptionColor}>{description}</text>
						</box>
					);
				})}
			</scrollbox>
		</box>
	);
}
