import type {
	ExtensionDebugInfo,
	ExtensionStateGroups,
} from "@/src/helpers/state";
import { usePopupState } from "./state";

export const SILLIES = [
	"Good luck debugging that.",
	"It's probably something silly, isn't it?",
];

export const createErrorReportForExtensionGroup = (
	group: keyof Omit<ExtensionStateGroups, symbol>,
) => {
	const debugInfo = usePopupState.getState().debugInfo;
	const state = usePopupState.getState().state?.groups?.[group];
	if (!debugInfo || !state || state.status !== "error")
		throw new Error(
			"invalid group passed to createErrorReportForExtensionGroup or debugInfo wasn't present",
		);
	return createErrorReport(
		`Extension group "${group}" failed to load`,
		state.error,
		debugInfo,
	);
};

export const createErrorReport = (
	cause: string,
	error: unknown,
	debugInfo: ExtensionDebugInfo,
) => {
	return `${SILLIES[Math.floor(Math.random() * SILLIES.length)]}

--- Error ---
${cause}
${JSON.stringify(error, Object.getOwnPropertyNames(error), 4)}

${createDebugInfoReport(debugInfo)}`;
};

export const createDebugInfoReport = (debugInfo: ExtensionDebugInfo) => {
	const groups = Object.entries(usePopupState.getState().state?.groups ?? {})
		.map(([k, v]) => `${k}: ${v.status}`)
		.join("\n");

	return `--- favedeck ---
Version ${import.meta.env.VITE_APP_VERSION} | commit ${import.meta.env.VITE_APP_HASH} (https://github.com/nedoxff/favedeck/commit/${import.meta.env.VITE_APP_HASH})

${groups}

--- Twitter ---
${debugInfo.reactVersion ? `Rendered with React v${debugInfo.reactVersion}` : "Couldn't detect the React version (Webpack probably failed)"}
window.__META_DATA__: ${debugInfo.globalMetadata ? `\n${JSON.stringify(debugInfo.globalMetadata, undefined, 4)}` : "not present"}`;
};
