import { getKeybindings } from "../config";
import type { ViewMode, VimMode } from "../hooks/useVimMode";
import { Spinner } from "./Spinner";

interface FooterProps {
	mode: VimMode;
	viewMode: ViewMode;
	isLoading?: boolean;
	error?: string | null;
}

export function Footer({
	mode,
	viewMode,
	isLoading = false,
	error = null,
}: FooterProps) {
	const modeColor = mode === "insert" ? "#00FF00" : "#888";
	const modeText = mode === "insert" ? "-- INSERT --" : "-- NORMAL --";
	const toggleViewKey = getKeybindings("toggleView")[0] ?? "m";

	const viewModeHelp =
		viewMode === "annotated"
			? "h/l: move, w/b: word, 0/$: line"
			: "j/k: move, gg/G: jump";

	return (
		<box height={1} flexDirection="row" gap={2}>
			<text fg={modeColor}>{modeText}</text>
			{error ? (
				<text fg="#F38BA8">{error}</text>
			) : (
				<>
					<text fg="#888">Press '{toggleViewKey}' to toggle view</text>
					<text fg="#888">{viewModeHelp}</text>
					<Spinner isActive={isLoading} />
				</>
			)}
		</box>
	);
}
