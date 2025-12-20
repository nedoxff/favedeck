import "@/assets/root.css";
export default defineContentScript({
	matches: ["*://*.x.com/*", "*://*.twitter.com/*"],
	async main() {
		console.log("injecting esm script...");
		const script = document.createElement("script");
		script.type = "module";
		script.src = browser.runtime.getURL("/content-scripts/esm/content.js");
		document.head.appendChild(script);
	},
});
