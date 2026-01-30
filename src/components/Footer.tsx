interface FooterProps {
	isLoading?: boolean;
}

export function Footer({ isLoading = false }: FooterProps) {
	return (
		<box height={1} flexDirection="row" gap={2}>
			<text fg="#888">Press 'v' to toggle view mode</text>
			{isLoading && <text fg="#888">Loading...</text>}
		</box>
	);
}
