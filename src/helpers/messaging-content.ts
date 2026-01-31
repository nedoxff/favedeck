import { defineWindowMessaging } from "@webext-core/messaging/page";
import type { PopupSyncPayload } from "../types/popup";
import type { ExtensionState } from "./state";

// sent between content scripts
interface WebsiteProtocolMap {
	syncIcon(color: string): void;
	syncState(state: ExtensionState): void;
	syncPopup(): PopupSyncPayload;
}

export const websiteMessenger = defineWindowMessaging<WebsiteProtocolMap>({
	namespace: "favedeck",
	logger: console,
});
