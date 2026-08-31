import "@/assets/root.css";
export default defineContentScript({
	matches: ["*://*.x.com/*", "*://*.twitter.com/*"],

	async main() {
		const nonce =
			Array.from(document.querySelectorAll("script"))
				.map((s) => s.nonce)
				.find((n) => n !== "") ?? "NOT-FOUND";
		console.log("nonce", nonce);

		console.log("injecting esm script...");
		const script = document.createElement("script");
		script.type = "module";
		script.id = "favedeck-module";
		script.nonce = nonce;
		script.src = browser.runtime.getURL("/content-scripts/esm/content.js");
		document.head.appendChild(script);
	},
});
