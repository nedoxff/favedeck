import type { ExtensionDebugInfo, ExtensionState } from "./state";

const SILLIES = [
	"Good luck debugging that.",
	"It's probably something silly, isn't it?",
];

const pad = (str: string) =>
	str
		.split("\n")
		.map((line) => `    ${line}`)
		.join("\n");
const stringifyError = (error: unknown): string => {
	if (!(error instanceof Error)) return `${error}`;
	return `${error.name}: ${error.message}\n${pad(error.stack ?? "no stack available")}${error.cause ? `\n[caused by] ${stringifyError(error.cause)}` : ""}`;
};

export const createErrorReport = (
	title: string,
	error: unknown,
	state: ExtensionState,
	debugInfo: ExtensionDebugInfo,
) => {
	return `${SILLIES[Math.floor(Math.random() * SILLIES.length)]}

--- Error ---
${title}
${stringifyError(error)}

${createDebugInfoReport(state, debugInfo)}`;
};

export const createDebugInfoReport = (
	state: ExtensionState,
	debugInfo: ExtensionDebugInfo,
) => {
	const groups = Object.entries(state.groups)
		.map(([k, v]) => `${k}: ${v.status}`)
		.join("\n");

	return `--- favedeck ---
Version ${import.meta.env.VITE_APP_VERSION} | commit ${import.meta.env.VITE_APP_HASH} (https://github.com/nedoxff/favedeck/commit/${import.meta.env.VITE_APP_HASH})

${groups}

--- Twitter ---
${debugInfo.reactVersion ? `Rendered with React v${debugInfo.reactVersion}` : "Couldn't detect the React version (Webpack probably failed)"}
window.__META_DATA__: ${debugInfo.globalMetadata ? `\n${JSON.stringify(debugInfo.globalMetadata, undefined, 4)}` : "not present"}`;
};
