export default defineContentScript({
	matches: ["*://*.x.com/*"],
	runAt: "document_start",
	async main(ctx) {
		window.addEventListener("message", (ev) => console.log(ev.data));
	},
});
