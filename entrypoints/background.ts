import { messenger } from "@/src/helpers/messaging-extension";

export default defineBackground(() => {
	messenger.onMessage("setIcon", (message) => {
		browser.action.setIcon({
			imageData: Object.fromEntries(
				Object.entries(message.data).map(([k, v]) => [
					k,
					new ImageData(
						new Uint8ClampedArray(v),
						Number.parseInt(k, 10),
						Number.parseInt(k, 10),
					),
				]),
			),
		});
	});
});
