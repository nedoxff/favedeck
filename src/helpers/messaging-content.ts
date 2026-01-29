import { defineWindowMessaging } from "@webext-core/messaging/page";

// sent between content scripts
interface WebsiteProtocolMap {
	syncIcon(color: string): void;
}

export const websiteMessenger = defineWindowMessaging<WebsiteProtocolMap>({
	namespace: "favedeck",
});
