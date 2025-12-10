export const waitForSelector = (el: Element, selector: string, timeout = -1) =>
	new Promise((resolve, reject) => {
		const existing = Array.from(el.querySelectorAll(selector)).at(0);
		if (existing) return resolve(existing);

		const observer = new MutationObserver((m) => {
			const selection = Array.from(el.querySelectorAll(selector)).at(0);
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
