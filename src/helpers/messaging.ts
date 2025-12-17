export type ContentMessageType = "hello" | "sync-theme";
export type ForwarderMessageType = "hello-acknowledge" | "request-state";

export type PopupMessageType = "request-state";
export type PopupResponseMessageType = "request-state-response";

export type ContentMessagePayload = {
	source: "favedeck";
	type: ContentMessageType;
	payload?: Record<string, unknown>;
};

export type ForwarderMessagePayload = {
	source: "favedeck";
	type: ForwarderMessageType;
	payload?: Record<string, unknown>;
};

export type PopupMessagePayload = {
	type: PopupMessageType;
	payload?: Record<string, unknown>;
};

export type PopupResponseMessagePayload = {
	type: PopupResponseMessageType;
	payload?: Record<string, unknown>;
};

export const isFromPostMessage = (obj: unknown) => {
	return (
		typeof obj === "object" &&
		obj !== null &&
		"source" in obj &&
		typeof obj.source === "string" &&
		obj.source === "favedeck"
	);
};

export const sendContentToForwarder = (payload: ContentMessagePayload) => {
	console.log(`[content -> forwarder] ${payload.type}`);
	window.postMessage(payload, "*");
};

export const sendForwarderToContent = (payload: ForwarderMessagePayload) => {
	console.log(`[forwarder -> content] ${payload.type}`);
	window.postMessage(payload, "*");
};
