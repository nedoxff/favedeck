import { defineWindowMessaging } from "@webext-core/messaging/page";
import type { ExtensionState } from "./state";

// sent between content scripts
interface WebsiteProtocolMap {
	syncIcon(color: string): void;
	syncState(state: ExtensionState): void;
	requestState(): void;
}

export const websiteMessenger = defineWindowMessaging<WebsiteProtocolMap>({
	namespace: "favedeck",
});
