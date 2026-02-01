import type { ExtensionDebugInfo, ExtensionState } from "../helpers/state";
import type { FavedeckThemeExtensions, TwitterTheme } from "./theme";

export type PopupSyncPayload = {
	state: ExtensionState;
	debugInfo: ExtensionDebugInfo;
	theme?: TwitterTheme & FavedeckThemeExtensions;
};
