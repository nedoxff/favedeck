import { websiteMessenger } from "@/src/helpers/messaging-content";
import { messenger } from "@/src/helpers/messaging-extension";
import { generateColoredIconBundle } from "@/src/isolated-or-background/icon-generator";

export default defineContentScript({
	matches: ["*://*.x.com/*", "*://*.twitter.com/*"],
	runAt: "document_start",
	async main(ctx) {
		websiteMessenger.onMessage("syncIcon", async (message) =>
			messenger.sendMessage(
				"setIcon",
				await generateColoredIconBundle(message.data),
			),
		);
	},
});
