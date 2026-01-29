import { useEffect, useState } from "react";

type SpinnerProps = {
	isActive: boolean;
};

function getSpinnerFrame(index: number): string {
	const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
	return frames[index % frames.length]!;
}

export function Spinner({ isActive }: SpinnerProps) {
	const [spinnerIndex, setSpinnerIndex] = useState(0);

	useEffect(() => {
		if (!isActive) {
			setSpinnerIndex(0);
			return undefined;
		}
		const timer = setInterval(() => {
			setSpinnerIndex((index) => index + 1);
		}, 120);
		return () => clearInterval(timer);
	}, [isActive]);

	if (!isActive) {
		return null;
	}

	return (
		<box
			style={{
				flexDirection: "row",
				justifyContent: "flex-end",
				width: "100%",
			}}
		>
			<text>{getSpinnerFrame(spinnerIndex)}</text>
		</box>
	);
}
