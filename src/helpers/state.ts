import type { GlobalMetadata } from "../window";
import { ignoreErrors } from "./errors";
import { websiteMessenger } from "./messaging-content";

export type GroupState =
	| { status: "loading" }
	| { status: "ok" }
	| { status: "error"; error: unknown };

export const EXTENSION_GROUP_LOADING: GroupState = { status: "loading" };
export const EXTENSION_GROUP_OK: GroupState = { status: "ok" };
export const EXTENSION_GROUP_ERROR = (error: unknown): GroupState => ({
	status: "error",
	error,
});

export type ExtensionStateGroups = {
	webpack: GroupState;
	redux: GroupState;
	tweetComponent: GroupState;

	messageListener: GroupState;
	fiberObserver: GroupState;
	tweetObserver: GroupState;
	urlObserver: GroupState;
	[EXTENSION_GROUPS_STATE_IDENTITY]?: ExtensionStateGroups;
};

export type ExtensionState = {
	groups: ExtensionStateGroups;
	fine: boolean;
};

export type ExtensionDebugInfo = {
	reactVersion?: string;
	globalMetadata?: Omit<GlobalMetadata, "cookies" | "tags">;
};

const EXTENSION_GROUPS_STATE_IDENTITY = Symbol("extension-state-proxy-target");

export const extensionState: ExtensionState = {
	fine: true,
	groups: new Proxy(
		{
			webpack: EXTENSION_GROUP_LOADING,
			redux: EXTENSION_GROUP_LOADING,
			tweetComponent: EXTENSION_GROUP_LOADING,

			messageListener: EXTENSION_GROUP_LOADING,
			fiberObserver: EXTENSION_GROUP_LOADING,
			tweetObserver: EXTENSION_GROUP_LOADING,
			urlObserver: EXTENSION_GROUP_LOADING,
		},
		{
			set(target, property, newValue, receiver) {
				Reflect.set(target, property, newValue, receiver);
				if (
					"status" in newValue &&
					typeof newValue.status === "string" &&
					newValue.status === "error"
				)
					extensionState.fine = false;
				ignoreErrors(() =>
					websiteMessenger.sendMessage("syncState", getRawExtensionState()),
				);
				return true;
			},
			get(target, property, receiver) {
				return property === EXTENSION_GROUPS_STATE_IDENTITY
					? target
					: Reflect.get(target, property, receiver);
			},
		},
	),
};

export const getRawExtensionState = (): ExtensionState => ({
	fine: extensionState.fine,
	// biome-ignore lint/style/noNonNullAssertion: i know what i'm doing (and so does the proxy)
	groups: extensionState.groups[EXTENSION_GROUPS_STATE_IDENTITY]!,
});
