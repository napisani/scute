import {
	getLeaderKey,
	getLeaderKeybindings,
	getNormalKeybindings,
} from "../config";
import type { ViewMode, VimMode } from "../hooks/useVimMode";
import { KeyHintBar } from "./KeyHintBar";
import { Spinner } from "./Spinner";

interface FooterProps {
	mode: VimMode;
	viewMode: ViewMode;
	leaderActive: boolean;
	isLoading?: boolean;
	error?: string | null;
}

export function Footer({
	mode,
	viewMode,
	leaderActive,
	isLoading = false,
	error = null,
}: FooterProps) {
	const modeColor = mode === "insert" ? "#00FF00" : "#888";
	const modeText = mode === "insert" ? "-- INSERT --" : "-- NORMAL --";
	const leaderKey = getLeaderKey()[0] ?? "space";
	const toggleViewKey = getLeaderKeybindings("toggleView")[0] ?? "m";
	const explainKey = getLeaderKeybindings("explain")[0] ?? "e";
	const quitKey = getLeaderKeybindings("quit")[0] ?? "q";
	const outputClipboardKey = getLeaderKeybindings("outputClipboard")[0] ?? "y";
	const outputReadlineKey = getLeaderKeybindings("outputReadline")[0] ?? "r";
	const outputStdoutKey = getLeaderKeybindings("outputStdout")[0] ?? "return";
	const outputPromptKey = getLeaderKeybindings("outputPrompt")[0] ?? "p";
	const insertKey = getNormalKeybindings("insert")[0] ?? "i";
	const appendKey = getNormalKeybindings("append")[0] ?? "a";
	const changeKey = getNormalKeybindings("change")[0] ?? "c";
	const exitInsertKey = getNormalKeybindings("exitInsert")[0] ?? "escape";
	const saveKey = getNormalKeybindings("save")[0] ?? "return";

	const viewModeHelp =
		viewMode === "annotated"
			? "h/l: move, w/b: word, 0/$: line"
			: "j/k: move, gg/G: jump";

	const keyHints = (() => {
		if (mode === "insert") {
			return [
				{ key: exitInsertKey, label: "cancel" },
				{ key: saveKey, label: "save" },
			];
		}
		if (leaderActive) {
			return [
				{ key: toggleViewKey, label: "change view" },
				{ key: explainKey, label: "explain tokens" },
				{ key: outputStdoutKey, label: "stdout" },
				{ key: outputClipboardKey, label: "clipboard" },
				{ key: outputReadlineKey, label: "readline" },
				{ key: outputPromptKey, label: "prompt" },
				{ key: quitKey, label: "quit" },
			];
		}
		return [
			{ key: leaderKey, label: "leader" },
			{ key: insertKey, label: "insert" },
			{ key: appendKey, label: "append" },
			{ key: changeKey, label: "change" },
		];
	})();

	return (
		<box height={1} flexDirection="row" gap={2}>
			<text fg={modeColor}>{modeText}</text>
			{error ? (
				<text fg="#F38BA8">{error}</text>
			) : (
				<>
					<KeyHintBar hints={keyHints} />
					<text fg="#888">{viewModeHelp}</text>
					<Spinner isActive={isLoading} />
				</>
			)}
		</box>
	);
}
