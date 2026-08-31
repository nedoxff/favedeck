import { messenger } from "@/src/helpers/messaging/extension";
import { autoBackup } from "@/src/isolated-or-background/auto-backup/root";
import { deckDownloader } from "@/src/isolated-or-background/deck-downloader/root";

export default defineBackground(() => {
	messenger.onMessage("deckDownloader:event", (message) =>
		deckDownloader.handleMessage(message.data),
	);

	messenger.onMessage("autoBackup:event", (message) =>
		autoBackup.handleMessage(message.data),
	);

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
