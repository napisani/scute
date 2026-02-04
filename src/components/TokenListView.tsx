import type { ScrollBoxRenderable } from "@opentui/core";
import { useEffect, useRef } from "react";
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
	selectedIndex: number;
	editingTokenIndex: number | null;
	editingValue: string;
	cursorPosition: number;
	onTokenChange: (value: string) => void;
}

export function TokenListView({
	coloredTokens,
	descriptions,
	tokenWidths,
	mode,
	selectedIndex,
	editingTokenIndex,
	editingValue,
	cursorPosition,
	onTokenChange,
}: TokenListViewProps) {
	const { typeWidth, tokenWidth } = tokenWidths;
	const descriptionColor = getThemeColorFor("tokenDescription");
	const scrollboxRef = useRef<ScrollBoxRenderable | null>(null);

	useEffect(() => {
		const scrollbox = scrollboxRef.current;
		if (!scrollbox) {
			return;
		}
		const viewportHeight = scrollbox.viewport.height;
		if (!viewportHeight) {
			return;
		}
		const currentTop = scrollbox.scrollTop;
		const currentBottom = currentTop + viewportHeight - 1;
		if (selectedIndex < currentTop) {
			scrollbox.scrollTo({ x: scrollbox.scrollLeft, y: selectedIndex });
			return;
		}
		if (selectedIndex > currentBottom) {
			const nextTop = Math.max(0, selectedIndex - viewportHeight + 1);
			scrollbox.scrollTo({ x: scrollbox.scrollLeft, y: nextTop });
		}
	}, [selectedIndex]);

	return (
		<box width="100%" height="100%" justifyContent="center" alignItems="center">
			<scrollbox ref={scrollboxRef} height="100%">
				<box
					flexDirection="column"
					minHeight="100%"
					width="100%"
					justifyContent="center"
					alignItems="flex-start"
				>
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
								/>
								<text fg={color}>
									{" ".repeat(tokenWidth - label.length + 2)}
								</text>
								<text fg={descriptionColor}>{description}</text>
							</box>
						);
					})}
				</box>
			</scrollbox>
		</box>
	);
}
