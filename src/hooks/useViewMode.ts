import { useKeyboard } from "@opentui/react";
import { useMemo, useState } from "react";
import { getConfigSnapshot, getKeybindings } from "../config";

export type ViewMode = "list" | "annotated";

export type UseViewModeOptions = {};

export function useViewMode(_options: UseViewModeOptions = {}) {
	const [viewMode, setViewMode] = useState<ViewMode>(() =>
		getConfigSnapshot().viewMode === "horizontal" ? "annotated" : "list",
	);
	const toggleViewKeys = useMemo(
		() => getKeybindings("toggleView") ?? ["v"],
		[],
	);

	useKeyboard((key) => {
		if (toggleViewKeys.includes(key.name)) {
			setViewMode((mode) => (mode === "list" ? "annotated" : "list"));
		}
	});

	return {
		viewMode,
		setViewMode,
	};
}
