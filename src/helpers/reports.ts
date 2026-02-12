import type { ExtensionDebugInfo, ExtensionState } from "./state";

const SILLIES = [
	"Good luck debugging that.",
	"It's probably something silly, isn't it?",
	"Oops...",
	"I guess it's time for a new version!",
	"I'm pretty sure it's a typo.",
];

const pad = (str: string) =>
	str
		.split("\n")
		.map((line) => `    ${line}`)
		.join("\n");

const toError = (error: unknown) => {
	return error &&
		typeof error === "object" &&
		"name" in error &&
		"stack" in error
		? Object.assign(new Error(), error)
		: error;
};

const stringifyError = (error: unknown): string => {
	const convertedError = toError(error);
	if (!(convertedError instanceof Error)) return `${error}`;
	return `${convertedError.name}: ${convertedError.message}\n${pad(convertedError.stack ?? "no stack available")}${convertedError.cause ? `\n[caused by] ${stringifyError(convertedError.cause)}` : ""}`;
};

export const createErrorReport = (title: string, error: unknown) => {
	return `${SILLIES[Math.floor(Math.random() * SILLIES.length)]}

--- Error ---
${title}
${stringifyError(error)}`;
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
