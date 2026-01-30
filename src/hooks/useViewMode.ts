import { useKeyboard } from "@opentui/react";
import { useMemo, useState } from "react";
import { getKeybindings } from "../config";

export type ViewMode = "list" | "annotated";

export function useViewMode() {
	const [viewMode, setViewMode] = useState<ViewMode>("list");
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
