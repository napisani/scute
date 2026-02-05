import { useCallback, useEffect, useRef, useState } from "react";
import { fetchTokenDescriptions } from "../core";
import type { ParsedCommand } from "../core/shells/common";

function mapDescriptions(rawDescriptions: string[]): string[] {
	return rawDescriptions;
}

export interface UseTokenDescriptionsOptions {
	command: ParsedCommand;
	tokenCount: number;
}

export function useTokenDescriptions({
	command,
	tokenCount,
}: UseTokenDescriptionsOptions) {
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

	const invalidateDescriptions = useCallback(
		(startIndex: number, count: number) => {
			if (count <= 0) {
				return;
			}
			setDescriptions((prev) => {
				if (!prev.length) {
					return prev;
				}
				const next = prev.slice();
				const end = Math.min(startIndex + count, next.length);
				for (let index = startIndex; index < end; index++) {
					next[index] = "";
				}
				return next;
			});
		},
		[],
	);

	const resetDescriptions = useCallback(() => {
		setDescriptions([]);
		setIsLoading(false);
		requestIdRef.current += 1;
	}, []);

	return {
		descriptions,
		isLoading,
		loadDescriptions,
		invalidateDescriptions,
		resetDescriptions,
	};
}
