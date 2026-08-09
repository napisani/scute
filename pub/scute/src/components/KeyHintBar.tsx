import { getThemeColorFor } from "../config";

export interface KeyHint {
	key: string;
	label: string;
}

interface KeyHintBarProps {
	hints: KeyHint[];
}

export function KeyHintBar({ hints }: KeyHintBarProps) {
	const keyColor = getThemeColorFor("markerColor");
	const labelColor = getThemeColorFor("hintLabelColor");

	if (!hints.length) {
		return null;
	}

	return (
		<box height={1} flexDirection="row" gap={2}>
			{hints.map((hint) => (
				<box key={`${hint.key}-${hint.label}`} flexDirection="row" gap={1}>
					<text fg={keyColor}>[{hint.key}]</text>
					<text fg={labelColor}>{hint.label}</text>
				</box>
			))}
		</box>
	);
}
