import { defineExtensionStorage } from "@webext-core/storage";
import type { FavedeckThemeExtensions, TwitterTheme } from "@/src/types/theme";

export interface PopupStorageSchema {
	lastSyncedTheme: (TwitterTheme & FavedeckThemeExtensions) | null;
}

export const popupStorage = defineExtensionStorage<PopupStorageSchema>(
	browser.storage.local,
);
