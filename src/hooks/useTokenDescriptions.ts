import { useCallback, useEffect, useRef, useState } from "react";
import { fetchTokenDescriptions } from "../core";
import type { ParsedCommand } from "../core/shells/common";

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
	const [error, setError] = useState<string | null>(null);
	const requestIdRef = useRef(0);

	// biome-ignore lint/correctness/useExhaustiveDependencies: Intentionally reset when token count changes
	useEffect(() => {
		setDescriptions([]);
		setIsLoading(false);
		setError(null);
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
		setError(null);
		try {
			const results = await fetchTokenDescriptions(command);
			if (requestIdRef.current === requestId) {
				setDescriptions(results);
			}
		} catch (err) {
			if (requestIdRef.current === requestId) {
				const message =
					err instanceof Error ? err.message : "Failed to load descriptions";
				setError(message);
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
		setError(null);
		requestIdRef.current += 1;
	}, []);

	return {
		descriptions,
		isLoading,
		error,
		loadDescriptions,
		invalidateDescriptions,
		resetDescriptions,
	};
}
