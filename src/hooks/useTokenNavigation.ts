import { useKeyboard } from "@opentui/react";
import { useMemo, useState } from "react";
import { getKeybindings } from "../config";

export interface UseTokenNavigationOptions {
	tokenCount: number;
}

export function useTokenNavigation({ tokenCount }: UseTokenNavigationOptions) {
	const [selectedIndex, setSelectedIndex] = useState(0);
	const upKeys = useMemo(() => getKeybindings("up"), []);
	const downKeys = useMemo(() => getKeybindings("down"), []);

	useKeyboard((key) => {
		if (upKeys.includes(key.name)) {
			setSelectedIndex((index) => Math.max(0, index - 1));
			return;
		}
		if (downKeys.includes(key.name)) {
			setSelectedIndex((index) => Math.min(tokenCount - 1, index + 1));
			return;
		}
	});

	return {
		selectedIndex,
		setSelectedIndex,
	};
}
