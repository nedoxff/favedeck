import { defineExtensionMessaging } from "@webext-core/messaging";
import type {
	DeckDownloaderCompleteConfiguration,
	DeckDownloaderState,
} from "@/src/isolated-or-background/deck-downloader/root";

// sent between background & offscreen (chromium mv3)
interface ProtocolMap {
	// Offscreen Deck Downloader (ODD)
	"ODD:abort"(): void;
	"ODD:begin"(configuration: DeckDownloaderCompleteConfiguration): void;
	"ODD:receiveState"(): DeckDownloaderState;
	"ODD:updateState"(payload: {
		newState: DeckDownloaderState;
		forward: boolean;
	}): void;
	"ODD:toggleContinuousUpdates"(enabled: boolean): void;
}

export const offscreenMessenger = defineExtensionMessaging<ProtocolMap>({
	logger: console,
});
