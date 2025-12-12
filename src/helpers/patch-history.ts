/** https://github.com/wxt-dev/wxt/issues/1567#issuecomment-2817546310 */
/** biome-ignore-all lint/suspicious/noExplicitAny: not my code sorry */

/**
 * Dispatches a "locationchange" event on client-side navigations
 *
 * - Adds listeners to "hashchange" and "popstate"
 * - Patches history.pushState and history.replaceState
 *
 * This script must be run in the main world (the context of the host page) in order for the patching to work
 */
export function observeUrl() {
	if ("pushStateOriginal" in window.history) return;
	const dispatch = () => window.dispatchEvent(new Event("locationchange"));

	function patchHistoryScript(): void {
		function patchedMethod<T extends (...args: any[]) => any>(
			method: T,
			callback: (...args: Parameters<T>) => void,
		): T {
			return function (this: any, ...args: Parameters<T>) {
				const value: ReturnType<T> = method.apply(this, args);
				callback(...args);
				return value;
			} as T;
		}

		(window.history as any).pushStateOriginal = window.history.pushState;
		(window.history as any).replaceStateOriginal = window.history.replaceState;

		window.history.pushState = patchedMethod(
			window.history.pushState,
			dispatch,
		);
		window.history.replaceState = patchedMethod(
			window.history.replaceState,
			dispatch,
		);
	}

	function restoreHistoryScript(): void {
		window.history.pushState = (window.history as any).pushStateOriginal;
		window.history.replaceState = (window.history as any).replaceStateOriginal;
	}

	window.addEventListener("hashchange", dispatch);
	window.addEventListener("popstate", dispatch);
	patchHistoryScript();

	return () => {
		window.removeEventListener("hashchange", dispatch);
		window.removeEventListener("popstate", dispatch);
		restoreHistoryScript();
	};
}
