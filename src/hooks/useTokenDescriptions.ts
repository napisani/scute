import { useCallback, useEffect, useRef, useState } from "react";
import { fetchTokenDescriptions } from "../core";
import type { ParsedCommand } from "../core/shells/common";

function mapDescriptions(rawDescriptions: string[]): string[] {
	return rawDescriptions;
}

export function useTokenDescriptions(
	command: ParsedCommand,
	tokenCount: number,
) {
	const [descriptions, setDescriptions] = useState<string[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const requestIdRef = useRef(0);

	// biome-ignore lint/correctness/useExhaustiveDependencies: Intentionally reset when token count changes
	useEffect(() => {
		setDescriptions([]);
		setIsLoading(false);
		requestIdRef.current += 1;
	}, [tokenCount]);

	useEffect(
		() => () => {
			requestIdRef.current += 1;
		},
		[],
	);

	const loadDescriptions = useCallback(async () => {
		if (isLoading || descriptions.length) {
			return;
		}
		const requestId = requestIdRef.current + 1;
		requestIdRef.current = requestId;
		setIsLoading(true);
		try {
			const results = await fetchTokenDescriptions(command);
			if (requestIdRef.current === requestId) {
				setDescriptions(mapDescriptions(results));
			}
		} finally {
			if (requestIdRef.current === requestId) {
				setIsLoading(false);
			}
		}
	}, [command, descriptions.length, isLoading]);

	return {
		descriptions,
		isLoading,
		loadDescriptions,
	};
}
