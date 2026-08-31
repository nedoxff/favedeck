import { defineWindowMessaging } from "@webext-core/messaging/page";
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

// sent between content scripts
interface WebsiteProtocolMap {
	syncIcon(color: string): void;
	syncState(state: ExtensionState): void;
	syncPopup(): PopupSyncPayload;
	"deckDownloader:forward"(message: DeckDownloaderMessage): void;
	"deckDownloader:update"(state: DeckDownloaderState): void;
	"autoBackup:forward"(message: AutoBackupMessage): void;
	"autoBackup:receive"(message: AutoBackupResponseMessage): void;
}

export const websiteMessenger = defineWindowMessaging<WebsiteProtocolMap>({
	namespace: "favedeck",
	logger: console,
});
