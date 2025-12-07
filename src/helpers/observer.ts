const firstThatMatches = (el: Element, selectors: string[]) => {
	const results = selectors
		.map((s) => el.querySelector(s))
		.filter((s) => s !== null);
	return results.length === 0 ? null : results[0];
};

export const waitForSelector = (
	el: Element,
	selector: string | string[],
	timeout = -1,
) =>
	new Promise((resolve, reject) => {
		const selectors = Array.isArray(selector) ? selector : [selector];
		const existing = firstThatMatches(el, selectors);
		if (existing) return resolve(existing);

		const observer = new MutationObserver((m) => {
			const selection = firstThatMatches(el, selectors);
			if (selection) {
				observer.disconnect();
				resolve(selection);
			}
		});

		if (timeout > 0)
			setTimeout(() => {
				observer.disconnect();
				reject();
			}, timeout);

		observer.observe(el, { childList: true, subtree: true });
	});
