import { defineExtensionMessaging } from "@webext-core/messaging";
import type {
	AutoBackupMessage,
	AutoBackupResponseMessage,
} from "@/src/isolated-or-background/auto-backup/root";
import type {
	DeckDownloaderMessage,
	DeckDownloaderState,
} from "@/src/isolated-or-background/deck-downloader/root";
import type { PopupSyncPayload } from "../../types/popup";
import type { ExtensionState } from "../state";

// sent between background & popup
interface ProtocolMap {
	setIcon(bundle: Record<number, Array<number>>): void;
	setState(state: ExtensionState): void;
	syncPopup(): PopupSyncPayload;
	"deckDownloader:event"(message: DeckDownloaderMessage): void;
	"deckDownloader:forwardUpdate"(state: DeckDownloaderState): void;
	"autoBackup:event"(message: AutoBackupMessage): void;
	"autoBackup:forward"(message: AutoBackupResponseMessage): void;
}

export const messenger = defineExtensionMessaging<ProtocolMap>({
	logger: console,
});
