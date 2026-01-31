import { defineExtensionMessaging } from "@webext-core/messaging";
import type { PopupSyncPayload } from "../types/popup";
import type { ExtensionState } from "./state";

// sent between background & popup
interface ProtocolMap {
	setIcon(bundle: Record<number, Array<number>>): void;
	setState(state: ExtensionState): void;
	syncPopup(): PopupSyncPayload;
}

export const messenger = defineExtensionMessaging<ProtocolMap>({
	logger: console,
});
