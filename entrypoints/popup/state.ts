import { create } from "zustand";
import type { ExtensionDebugInfo, ExtensionState } from "@/src/helpers/state";
import type { FavedeckThemeExtensions, TwitterTheme } from "@/src/types/theme";

interface PopupState {
	state?: ExtensionState;
	debugInfo?: ExtensionDebugInfo;
	currentTab?: Browser.tabs.Tab;
	theme: (TwitterTheme & FavedeckThemeExtensions) | null;
}

export const usePopupState = create<PopupState>((set) => ({
	theme: null,
}));
