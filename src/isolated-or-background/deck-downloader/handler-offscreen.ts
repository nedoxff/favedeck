import { Result } from "better-result";
import { messenger } from "@/src/helpers/messaging/extension";
import { offscreenMessenger } from "@/src/helpers/messaging/offscreen";
import { sendToContent } from "@/src/helpers/messaging/utils";
import { type DeckDownloaderHandler, deckDownloader } from "./root";

export default (() => {
	return {
		abortDownload: () => offscreenMessenger.sendMessage("ODD:abort"),
		receiveState: () =>
			offscreenMessenger
				.sendMessage("ODD:receiveState")
				.then((st) => Result.ok(st))
				.catch((err) => Result.err(err)),
		updateState: (newState) =>
			offscreenMessenger.sendMessage("ODD:updateState", {
				newState,
				forward: false,
			}),
		beginDownload: async (configuration) =>
			await Result.tryPromise(async () => {
				await createOffscreenDocument();

				const removeListener = offscreenMessenger.onMessage(
					"ODD:updateState",
					async (message) => {
						await deckDownloader.handleMessage({
							type: "updateState",
							data: { newState: message.data.newState },
						});
						if (message.data.forward)
							await sendToContent((tab) =>
								messenger.sendMessage(
									"deckDownloader:forwardUpdate",
									message.data.newState,
									tab,
								),
							);

						if (
							message.data.newState.state === "idle" ||
							message.data.newState.state === "complete"
						) {
							console.log("closing offscreen downloader");
							await closeOffscreenDocument();
							removeListener();
						}
					},
				);

				await offscreenMessenger.sendMessage("ODD:begin", configuration);
			}),
		toggleContinuousUpdates: (enabled) =>
			offscreenMessenger.sendMessage("ODD:toggleContinuousUpdates", enabled),
	};
})() satisfies DeckDownloaderHandler;

// most of offscreen-related code has been adapted from WXT's examples repository
async function createOffscreenDocument() {
	if (await hasOffscreenDocument()) return;

	await browser.offscreen.createDocument({
		url: browser.runtime.getURL("/offscreen.html"),
		reasons: [browser.offscreen.Reason.BLOBS],
		justification:
			"download decks (.zip archives) in the background without interrupting the user",
	});
}

async function closeOffscreenDocument() {
	if (!(await hasOffscreenDocument())) return;
	await browser.offscreen.closeDocument();
}

async function hasOffscreenDocument() {
	const contexts = await browser.runtime?.getContexts({
		contextTypes: [browser.runtime.ContextType.OFFSCREEN_DOCUMENT],
		documentUrls: [browser.runtime.getURL("/offscreen.html")],
	});

	if (contexts != null) {
		return contexts.length > 0;
	} else {
		//@ts-expect-error
		const matchedClients = await self.clients.matchAll();
		//@ts-expect-error
		return matchedClients.some((client) =>
			client.url.includes(browser.runtime.id),
		);
	}
}
