export default defineContentScript({
	matches: ["*://*.x.com/*"],
	world: "MAIN",
	runAt: "document_start",
	async main() {
		console.log("importing bippy/install-hook-only");
		await import("bippy/install-hook-only");
	},
});
