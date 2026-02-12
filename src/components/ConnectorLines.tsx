import {
	buildConnectorLine,
	buildConnectorStemLine,
} from "../utils/annotatedRenderer.utils";

interface ConnectorLinesProps {
	width: number;
	boxCenter: number;
	connectorPos: number;
	color: string;
}

export function ConnectorLines({
	width,
	boxCenter,
	connectorPos,
	color,
}: ConnectorLinesProps) {
	const stem = buildConnectorStemLine(width, boxCenter);
	const line = buildConnectorLine(width, boxCenter, connectorPos);

	return (
		<>
			<text fg={color}>{stem}</text>
			<text fg={color}>{line}</text>
		</>
	);
}
