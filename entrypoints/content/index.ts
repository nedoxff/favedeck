import "@/assets/root.css";
export default defineContentScript({
	matches: ["*://*.x.com/*"],
	async main(ctx) {
		console.log("hii");

		const script = document.createElement("script");
		script.type = "module";
		script.src = browser.runtime.getURL("/content-scripts/esm/content.js");
		document.head.appendChild(script);
	},
});
