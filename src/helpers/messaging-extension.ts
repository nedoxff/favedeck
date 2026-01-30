import { defineExtensionMessaging } from "@webext-core/messaging";
import type { ExtensionState } from "./state";

// sent between background & popup
interface ProtocolMap {
	setIcon(bundle: Record<number, Array<number>>): void;
	setState(state: ExtensionState): void;
	requestState(): void;
}

export const messenger = defineExtensionMessaging<ProtocolMap>();
