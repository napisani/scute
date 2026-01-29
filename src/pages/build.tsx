import { useKeyboard } from "@opentui/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Spinner } from "../components/Spinner";
import { getKeybindings, getTokenColor } from "../config";
import { fetchTokenDescriptions } from "../core";
import { parseTokens } from "../core/shells";
import type { ParsedCommand, ParsedToken } from "../core/shells/common";

type BuildAppProps = {
	command: ParsedCommand;
};

function formatToken(token: ParsedToken): string {
	return token.value;
}

function formatTokenType(token: ParsedToken): string {
	return token.type;
}

function mapDescriptions(rawDescriptions: string[]): string[] {
	return rawDescriptions;
}

export function BuildApp({ command }: BuildAppProps) {
	const parsedTokens = useMemo(
		() => parseTokens(command.tokens),
		[command.tokens],
	);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [descriptions, setDescriptions] = useState<string[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const upKeys = useMemo(() => getKeybindings("up"), []);
	const downKeys = useMemo(() => getKeybindings("down"), []);
	const explainKeys = useMemo(() => getKeybindings("explain"), []);
	const requestIdRef = useRef(0);
	const { typeWidth, tokenWidth } = useMemo(() => {
		if (!parsedTokens.length) {
			return { typeWidth: 8, tokenWidth: 12 };
		}
		const typeLabelWidths = parsedTokens.map(
			(token: ParsedToken) => formatTokenType(token).length,
		);
		const tokenLabelWidths = parsedTokens.map(
			(token: ParsedToken) => formatToken(token).length,
		);
		return {
			typeWidth: Math.max(8, ...typeLabelWidths),
			tokenWidth: Math.max(12, ...tokenLabelWidths),
		};
	}, [parsedTokens]);

	useEffect(() => {
		const tokenCount = parsedTokens.length;
		setDescriptions([]);
		setIsLoading(false);
		requestIdRef.current += 1;
		if (!tokenCount) {
			setSelectedIndex(0);
		}
	}, [parsedTokens]);

	useEffect(
		() => () => {
			requestIdRef.current += 1;
		},
		[],
	);

	useEffect(() => {
		setSelectedIndex((index) =>
			parsedTokens.length ? Math.min(index, parsedTokens.length - 1) : 0,
		);
	}, [parsedTokens.length]);

	const loadDescriptions = useCallback(async () => {
		if (isLoading || descriptions.length) {
			return;
		}
		const requestId = requestIdRef.current + 1;
		requestIdRef.current = requestId;
		setIsLoading(true);
		try {
			const results = await fetchTokenDescriptions(command);
			if (requestIdRef.current === requestId) {
				setDescriptions(mapDescriptions(results));
			}
		} finally {
			if (requestIdRef.current === requestId) {
				setIsLoading(false);
			}
		}
	}, [command, descriptions.length, isLoading]);

	useKeyboard((key) => {
		if (upKeys.includes(key.name)) {
			setSelectedIndex((index) => Math.max(0, index - 1));
			return;
		}
		if (downKeys.includes(key.name)) {
			setSelectedIndex((index) => Math.min(parsedTokens.length - 1, index + 1));
			return;
		}
		if (explainKeys.includes(key.name)) {
			void loadDescriptions();
		}
	});

	if (!parsedTokens.length) {
		return <text>(no tokens)</text>;
	}

	return (
		<box
			border
			borderStyle="rounded"
			flexDirection="column"
			height="100%"
			width="100%"
			padding={1}
		>
			<Spinner isActive={isLoading} />
			<box flexGrow={1} width="100%">
				<scrollbox height="100%">
					{parsedTokens.map((token: ParsedToken, index: number) => {
						const description = descriptions[index] ?? "";
						const label = formatToken(token);
						const typeLabel = formatTokenType(token);
						const isSelected = index === selectedIndex;
						const key = `${token.type}-${label}-${index}`;
						const tokenColor = getTokenColor(token.type);
						const textColor = isSelected ? "cyan" : tokenColor;
						return (
							<box key={key} style={{ flexDirection: "row" }}>
								<text fg={textColor}>
									{isSelected ? "> " : "  "}
									{typeLabel.padEnd(typeWidth + 2, " ")}
									{label.padEnd(tokenWidth + 2, " ")}
								</text>
								<text fg={textColor}>{description}</text>
							</box>
						);
					})}
				</scrollbox>
			</box>
		</box>
	);
}
