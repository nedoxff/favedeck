import { defineExtensionMessaging } from "@webext-core/messaging";

// sent between background & popup
interface ProtocolMap {
	setIcon(bundle: Record<number, Array<number>>): void;
}

export const messenger = defineExtensionMessaging<ProtocolMap>();
