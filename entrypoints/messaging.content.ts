import {
	type ContentMessagePayload,
	isFromPostMessage,
	sendForwarderToContent,
} from "@/src/helpers/messaging";

export default defineContentScript({
	matches: ["*://*.x.com/*", "*://*.twitter.com/*"],
	runAt: "document_start",
	async main(ctx) {
		window.addEventListener("message", (ev) => {
			if (!isFromPostMessage(ev.data)) return;
			const payload = ev.data as ContentMessagePayload;
			switch (payload.type) {
				case "hello":
					sendForwarderToContent({
						source: "favedeck",
						type: "hello-acknowledge",
					});
					break;
				case "sync-theme":
					break;
			}
		});
	},
});
