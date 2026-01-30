import { getThemeColorFor } from "../config";
import type { ColoredToken } from "../hooks/useColoredTokens";
import type { TokenWidths } from "../hooks/useTokenWidth";
import { formatToken, formatTokenType } from "../utils/tokenFormatters";

interface TokenListViewProps {
	coloredTokens: ColoredToken[];
	descriptions: string[];
	tokenWidths: TokenWidths;
}

export function TokenListView({
	coloredTokens,
	descriptions,
	tokenWidths,
}: TokenListViewProps) {
	const { typeWidth, tokenWidth } = tokenWidths;
	const descriptionColor = getThemeColorFor("tokenDescription");

	return (
		<scrollbox height="100%">
			{coloredTokens.map((coloredToken) => {
				const { token, index, color, isSelected } = coloredToken;
				const description = descriptions[index] ?? "";
				const label = formatToken(token);
				const typeLabel = formatTokenType(token);
				const key = `${token.type}-${label}-${index}`;
				return (
					<box key={key} style={{ flexDirection: "row" }}>
						<text fg={color}>
							{isSelected ? "> " : "  "}
							{typeLabel.padEnd(typeWidth + 2, " ")}
							{label.padEnd(tokenWidth + 2, " ")}
						</text>
						<text fg={descriptionColor}>{description}</text>
					</box>
				);
			})}
		</scrollbox>
	);
}
