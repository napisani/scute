import { wrapText } from "../utils/annotatedRenderer.utils";
import { ConnectorLines } from "./ConnectorLines";

interface DescriptionBlockProps {
	description: string;
	maxWidth: number;
	connectorPos: number;
	color: string;
}

export function DescriptionBlock({
	description,
	maxWidth,
	connectorPos,
	color,
}: DescriptionBlockProps) {
	const sanitized = description.replace(/\s+/g, " ").trim();
	const width = Math.max(1, maxWidth);
	const maxContentWidth = Math.max(1, width - 4);
	const wrapped = wrapText(sanitized, maxContentWidth);
	const maxLineLength = wrapped.reduce(
		(max, line) => Math.max(max, line.length),
		0,
	);
	const innerWidth = Math.max(2, Math.min(width - 2, maxLineLength + 2));
	const boxWidth = innerWidth + 2;
	const boxCenter = Math.floor(boxWidth / 2);

	return (
		<box flexDirection="column">
			<box border borderStyle="single" borderColor={color} width={boxWidth}>
				<text fg={color}>{wrapped.join("\n")}</text>
			</box>
			<ConnectorLines
				width={width}
				boxCenter={boxCenter}
				connectorPos={connectorPos}
				color={color}
			/>
		</box>
	);
}
