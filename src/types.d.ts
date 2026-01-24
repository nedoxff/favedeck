/// <reference types="vite-plugin-svgr/client" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_APP_HASH: string;
	readonly VITE_APP_VERSION: string;
}

// biome-ignore lint/correctness/noUnusedVariables: it IS used
interface ImportMeta {
	readonly env: ImportMetaEnv;
}
