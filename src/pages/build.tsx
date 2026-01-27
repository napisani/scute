type BuildAppProps = {
	tokens: string[];
};

export function BuildApp({ tokens }: BuildAppProps) {
	if (!tokens.length) {
		return <text>(no tokens)</text>;
	}
	return <text>{tokens.join("\n")}</text>;
}
