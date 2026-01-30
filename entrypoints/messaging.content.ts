import { ignoreErrors } from "@/src/helpers/errors";
import { websiteMessenger } from "@/src/helpers/messaging-content";
import { messenger } from "@/src/helpers/messaging-extension";
import { generateColoredIconBundle } from "@/src/isolated-or-background/icon-generator";

export default defineContentScript({
	matches: ["*://*.x.com/*", "*://*.twitter.com/*"],
	runAt: "document_start",
	async main() {
		websiteMessenger.onMessage(
			"syncIcon",
			async (message) =>
				await (await generateColoredIconBundle(message.data)).match({
					ok: (bundle) => messenger.sendMessage("setIcon", bundle),
					err: async (err) =>
						console.error("failed to generate an icon bundle", err),
				}),
		);

		websiteMessenger.onMessage("syncState", (message) =>
			ignoreErrors(() => messenger.sendMessage("setState", message.data)),
		);
		messenger.onMessage("requestState", () =>
			ignoreErrors(() => websiteMessenger.sendMessage("requestState")),
		);
	},
});
