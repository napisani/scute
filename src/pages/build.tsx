import { useKeyboard } from "@opentui/react";
import { useEffect, useMemo, useState } from "react";
import { getKeybindings } from "../config";
import { fetchTokenDescriptions } from "../core";
import { parseTokens } from "../core/shells";
import type { ParsedCommand, ParsedToken } from "../core/shells/common";

type BuildAppProps = {
	command: ParsedCommand;
};

function formatToken(token: ParsedToken): string {
	return token.optionValue
		? `${token.value} ${token.optionValue}`
		: token.value;
}

function formatTokenType(token: ParsedToken): string {
	return token.optionValue ? "option+value" : token.type;
}

function mapDescriptions(
	rawDescriptions: string[],
	parsedTokens: ParsedToken[],
): string[] {
	const mapped: string[] = [];
	let index = 0;
	for (const token of parsedTokens) {
		if (token.optionValue) {
			const optionDescription = rawDescriptions[index] ?? "";
			const valueDescription = rawDescriptions[index + 1] ?? "";
			mapped.push(
				[optionDescription, valueDescription].filter(Boolean).join(" "),
			);
			index += 2;
			continue;
		}
		mapped.push(rawDescriptions[index] ?? "");
		index += 1;
	}
	return mapped;
}

export function BuildApp({ command }: BuildAppProps) {
	const parsedTokens = useMemo(
		() => parseTokens(command.tokens),
		[command.tokens],
	);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [descriptions, setDescriptions] = useState<string[]>([]);
	const upKeys = useMemo(() => getKeybindings("up"), []);
	const downKeys = useMemo(() => getKeybindings("down"), []);
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
		let cancelled = false;
		const loadDescriptions = async () => {
			const results = await fetchTokenDescriptions(command);
			if (!cancelled) {
				setDescriptions(mapDescriptions(results, parsedTokens));
			}
		};
		loadDescriptions();
		return () => {
			cancelled = true;
		};
	}, [command, parsedTokens]);

	useEffect(() => {
		setSelectedIndex((index) =>
			parsedTokens.length ? Math.min(index, parsedTokens.length - 1) : 0,
		);
	}, [parsedTokens.length]);

	useKeyboard((key) => {
		if (upKeys.includes(key.name)) {
			setSelectedIndex((index) => Math.max(0, index - 1));
			return;
		}
		if (downKeys.includes(key.name)) {
			setSelectedIndex((index) => Math.min(parsedTokens.length - 1, index + 1));
		}
	});

	if (!parsedTokens.length) {
		return <text>(no tokens)</text>;
	}

	return (
		<box style={{ flexDirection: "column" }}>
			{parsedTokens.map((token: ParsedToken, index: number) => {
				const description = descriptions[index] ?? "";
				const label = formatToken(token);
				const typeLabel = formatTokenType(token);
				const isSelected = index === selectedIndex;
				const key = `${token.type}-${label}-${token.optionValue ?? ""}`;
				return (
					<box key={key} style={{ flexDirection: "row" }}>
						<text fg={isSelected ? "cyan" : undefined}>
							{isSelected ? "> " : "  "}
							{typeLabel.padEnd(typeWidth + 2, " ")}
							{label.padEnd(tokenWidth + 2, " ")}
						</text>
						<text fg={isSelected ? "cyan" : undefined}>{description}</text>
					</box>
				);
			})}
		</box>
	);
}
