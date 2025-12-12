export const waitForSelector = (
	el: Element,
	selector: string,
	timeout = -1,
): Promise<HTMLElement | undefined> =>
	new Promise((resolve, reject) => {
		const existing = Array.from(el.querySelectorAll(selector)).at(0);
		if (existing && existing instanceof HTMLElement) return resolve(existing);

		const observer = new MutationObserver(() => {
			const selection = Array.from(el.querySelectorAll(selector)).at(0);
			if (selection && selection instanceof HTMLElement) {
				observer.disconnect();
				resolve(selection);
			}
		});

		if (timeout > 0)
			setTimeout(() => {
				observer.disconnect();
				resolve(undefined);
			}, timeout);

		observer.observe(el, { childList: true, subtree: true });
	});
