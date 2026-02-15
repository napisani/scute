import {
	getLeaderKey,
	getLeaderKeybindings,
	getNormalKeybindings,
	getThemeColorFor,
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
	const isInsertLike =
		mode === "insert" || mode === "suggest" || mode === "generate";
	const modeColor = isInsertLike
		? getThemeColorFor("modeInsertColor")
		: getThemeColorFor("modeNormalColor");
	const modeText = isInsertLike ? "-- INSERT --" : "-- NORMAL --";
	const leaderKey = getLeaderKey()[0] ?? "space";
	const toggleViewKey = getLeaderKeybindings("toggleView")[0] ?? "m";
	const explainKey = getLeaderKeybindings("explain")[0] ?? "e";
	const quitKey = getLeaderKeybindings("quit")[0] ?? "q";
	const submitKey = getLeaderKeybindings("submit")[0] ?? "return";
	const insertKey = getNormalKeybindings("insert")[0] ?? "i";
	const appendKey = getNormalKeybindings("append")[0] ?? "a";
	const changeKey = getNormalKeybindings("change")[0] ?? "c";
	const suggestKey = getLeaderKeybindings("suggest")[0] ?? "s";
	const generateKey = getLeaderKeybindings("generate")[0] ?? "g";
	const exitInsertKey = getNormalKeybindings("exitInsert")[0] ?? "escape";
	const saveKey = getNormalKeybindings("save")[0] ?? "return";

	const viewModeHelp =
		viewMode === "annotated"
			? "h/l: move, w/b: word, 0/$: line"
			: "j/k: move, gg/G: jump";

	const keyHints = (() => {
		if (mode === "suggest" || mode === "generate") {
			return [
				{ key: "enter", label: "submit" },
				{ key: "esc", label: "cancel" },
			];
		}
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
				{ key: suggestKey, label: "suggest" },
				{ key: generateKey, label: "generate" },
				{ key: submitKey, label: "submit" },
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
				<text fg={getThemeColorFor("errorColor")}>{error}</text>
			) : (
				<>
					<KeyHintBar hints={keyHints} />
					<text fg={getThemeColorFor("hintLabelColor")}>{viewModeHelp}</text>
					<Spinner isActive={isLoading} />
				</>
			)}
		</box>
	);
}
