import { matchers } from "../internals/matchers";

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

export const createTweetObserver = (callback: (node: HTMLElement) => void) => {
	const tweetObserver = new MutationObserver(async (mutations) => {
		for (const mutation of mutations) {
			if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
				for (const node of mutation.addedNodes) {
					if (!(node instanceof HTMLElement)) continue;
					for (const tweetNode of (node as HTMLElement).querySelectorAll(
						"article[data-testid=tweet]",
					))
						callback(tweetNode as HTMLElement);
				}
			} else if (mutation.type === "attributes") {
				const tweetNode = (mutation.target as HTMLElement).querySelector(
					matchers.tweet.querySelector,
				);
				if (
					tweetNode &&
					getComputedStyle(mutation.target as HTMLElement).display === "flex"
				)
					callback(tweetNode as HTMLElement);
			}
		}
	});
	tweetObserver.observe(document.body, {
		childList: true,
		subtree: true,
		attributes: true,
		attributeOldValue: true,
		attributeFilter: ["style"],
	});
	return tweetObserver;
};
