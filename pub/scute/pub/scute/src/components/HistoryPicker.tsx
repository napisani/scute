import { useKeyboard } from "@opentui/react";
import { useMemo } from "react";
import { getThemeColorFor } from "../config";
import type { KeyboardKey } from "../utils/keyboard";

interface HistoryPickerProps {
	history: string[];
	isLoading?: boolean;
	onSelect: (command: string) => void;
	onCancel: () => void;
}

export function HistoryPicker({
	history,
	isLoading = false,
	onSelect,
	onCancel,
}: HistoryPickerProps) {
	const labelColor = getThemeColorFor("hintLabelColor");

	const options = useMemo(() => {
		if (isLoading) {
			return [{ name: "Loading history...", description: "" }];
		}
		if (!history.length) {
			return [{ name: "No history entries found.", description: "" }];
		}
		return history.map((command) => ({ name: command, description: "" }));
	}, [history, isLoading]);

	const initialIndex = history.length ? history.length - 1 : 0;
	const hasEntries = !isLoading && history.length > 0;

	useKeyboard((key: KeyboardKey) => {
		if (key.name === "escape") {
			key.preventDefault?.();
			onCancel();
		}
	});

	return (
		<box height="100%" width="100%" flexDirection="column">
			<text fg={labelColor}>History</text>
			<select
				options={options}
				selectedIndex={initialIndex}
				onSelect={(index, option) => {
					if (hasEntries && option) {
						onSelect(option.name);
					}
				}}
				focused
				height="100%"
				showScrollIndicator
				showDescription={false}
			/>
		</box>
	);
}
