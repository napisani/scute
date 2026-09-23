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

type KeyHint = { key: string; label: string };

function getModeColor(mode: VimMode): string {
	if (mode === "insert" || mode === "suggest" || mode === "generate") {
		return getThemeColorFor("modeInsertColor");
	}
	return getThemeColorFor("modeNormalColor");
}

function getModeText(mode: VimMode): string {
	if (mode === "insert" || mode === "suggest" || mode === "generate") {
		return "-- INSERT --";
	}
	if (mode === "history") {
		return "-- HISTORY --";
	}
	return "-- NORMAL --";
}

function getViewModeHelp(mode: VimMode, viewMode: ViewMode): string {
	if (mode === "history") {
		return "";
	}
	if (viewMode === "annotated") {
		return "h/l: move, w/b: word, 0/$: line";
	}
	return "j/k: move, gg/G: jump";
}

interface KeyHintOptions {
	mode: VimMode;
	leaderActive: boolean;
	leaderKey: string;
	toggleViewKey: string;
	explainKey: string;
	quitKey: string;
	submitKey: string;
	insertKey: string;
	appendKey: string;
	changeKey: string;
	suggestKey: string;
	generateKey: string;
	historyKey: string;
	exitInsertKey: string;
	saveKey: string;
}

function getKeyHints({
	mode,
	leaderActive,
	leaderKey,
	toggleViewKey,
	explainKey,
	quitKey,
	submitKey,
	insertKey,
	appendKey,
	changeKey,
	suggestKey,
	generateKey,
	historyKey,
	exitInsertKey,
	saveKey,
}: KeyHintOptions): KeyHint[] {
	if (mode === "suggest" || mode === "generate") {
		return [
			{ key: "enter", label: "submit" },
			{ key: "esc", label: "cancel" },
		];
	}
	if (mode === "history") {
		return [
			{ key: "up/k", label: "older" },
			{ key: "down/j", label: "newer" },
			{ key: "enter", label: "select" },
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
			{ key: historyKey, label: "history" },
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
}

export function Footer({
	mode,
	viewMode,
	leaderActive,
	isLoading = false,
	error = null,
}: FooterProps) {
	const modeColor = getModeColor(mode);
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
	const historyKey = getLeaderKeybindings("history")[0] ?? "r";
	const exitInsertKey = getNormalKeybindings("exitInsert")[0] ?? "escape";
	const saveKey = getNormalKeybindings("save")[0] ?? "return";
	const viewModeHelp = getViewModeHelp(mode, viewMode);
	const keyHints = getKeyHints({
		mode,
		leaderActive,
		leaderKey,
		toggleViewKey,
		explainKey,
		quitKey,
		submitKey,
		insertKey,
		appendKey,
		changeKey,
		suggestKey,
		generateKey,
		historyKey,
		exitInsertKey,
		saveKey,
	});

	return (
		<box height={1} flexDirection="row" gap={2}>
			<text fg={modeColor}>{getModeText(mode)}</text>
			{error ? (
				<text fg={getThemeColorFor("errorColor")}>{error}</text>
			) : (
				<>
					<KeyHintBar hints={keyHints} />
					{viewModeHelp ? (
						<text fg={getThemeColorFor("hintLabelColor")}>
							{viewModeHelp}
						</text>
					) : null}
					<Spinner isActive={isLoading} />
				</>
			)}
		</box>
	);
}
