import { ignoreErrors } from "../errors";

export const sendToContent = async (send: (tab?: number) => Promise<void>) =>
	await ignoreErrors(async () => {
		const tabs = await browser.tabs.query({
			url: ["*://*.x.com/*", "*://*.twitter.com/*"],
		});
		for (const tab of tabs) await ignoreErrors(() => send(tab.id));
	});
