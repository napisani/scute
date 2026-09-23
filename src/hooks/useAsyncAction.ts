import { useCallback, useRef, useState } from "react";

export interface UseAsyncActionHandlers<T> {
	onSuccess: (result: T) => void;
	/** Called once, after `error` is set, for both an empty result and a thrown error. */
	onError?: (message: string) => void;
	/** Message to surface when the action resolves to a falsy value. Defaults to `defaultErrorMessage`. */
	emptyResultMessage?: string;
}

export interface UseAsyncActionResult<T> {
	isLoading: boolean;
	error: string | null;
	/** Runs `action`; a later call supersedes any in-flight one, whose resolution is then discarded. */
	run: (action: () => Promise<T | null | undefined>, handlers: UseAsyncActionHandlers<T>) => void;
	/** Discards any in-flight call's eventual resolution and clears isLoading/error. */
	reset: () => void;
}

// The request-id guard keeps a stale in-flight call from overwriting state
// once a newer call to `run` has superseded it.
export function useAsyncAction<T>(
	defaultErrorMessage: string,
): UseAsyncActionResult<T> {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const requestIdRef = useRef(0);

	const run = useCallback(
		(
			action: () => Promise<T | null | undefined>,
			handlers: UseAsyncActionHandlers<T>,
		) => {
			const requestId = requestIdRef.current + 1;
			requestIdRef.current = requestId;
			setIsLoading(true);
			setError(null);

			action()
				.then((result) => {
					if (requestIdRef.current !== requestId) {
						return;
					}
					if (result) {
						handlers.onSuccess(result);
						return;
					}
					const message = handlers.emptyResultMessage ?? defaultErrorMessage;
					setError(message);
					handlers.onError?.(message);
				})
				.catch(() => {
					if (requestIdRef.current !== requestId) {
						return;
					}
					setError(defaultErrorMessage);
					handlers.onError?.(defaultErrorMessage);
				})
				.finally(() => {
					if (requestIdRef.current !== requestId) {
						return;
					}
					setIsLoading(false);
				});
		},
		[defaultErrorMessage],
	);

	const reset = useCallback(() => {
		requestIdRef.current += 1;
		setIsLoading(false);
		setError(null);
	}, []);

	return { isLoading, error, run, reset };
}
