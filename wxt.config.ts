import * as child from "node:child_process";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import icons from "unplugin-icons/vite";
import type { Plugin } from "vite";
import svgr from "vite-plugin-svgr";
import { defineConfig } from "wxt";

export default defineConfig({
	modules: ["@wxt-dev/module-react"],

	vite: () => ({
		plugins: [
			twitterReactHijacker(),
			tailwindcss(),
			icons({ compiler: "jsx", jsx: "react" }),
			svgr(),
		],
		define: {
			"import.meta.env.VITE_APP_HASH": JSON.stringify(
				child.execSync("git log -1 --pretty=%h").toString().trim(),
			),
			"import.meta.env.VITE_APP_VERSION": JSON.stringify(
				process.env.npm_package_version,
			),
		},
		build: {
			sourcemap: true,
		},
	}),
	manifest: {
		permissions: ["storage", "tabs", "clipboardWrite"],
		host_permissions: ["*://*.x.com/*", "*://*.twitter.com/*"],
		web_accessible_resources: [{ resources: ["img/**"], matches: ["*://*/*"] }],
		browser_specific_settings: {
			gecko: {
				id: "favedeck@nedoxff.marten",
				// @ts-expect-error
				data_collection_permissions: {
					required: ["authenticationInfo"],
				},
			},
		},
	},
	manifestVersion: 3,
});

const twitterReactHijacker = async (): Promise<Plugin> => {
	const resolveMap: Record<string, string> = {
		react: path.resolve(__dirname, "src/internals/proxies/react-proxy.ts"),
		"react-dom": path.resolve(
			__dirname,
			"src/internals/proxies/react-dom-proxy.ts",
		),
		"react-dom/client": path.resolve(
			__dirname,
			"src/internals/proxies/react-dom-proxy.ts",
		),
		"react/jsx-runtime": path.resolve(
			__dirname,
			"src/internals/proxies/react-jsx-runtime-proxy.ts",
		),
		"react/jsx-dev-runtime": path.resolve(
			__dirname,
			"src/internals/proxies/react-jsx-runtime-proxy.ts",
		),
	};
	const SOURCES: Set<string> = new Set([
		"react",
		"react-dom",
		"react-dom/client",
		"react/jsx-runtime",
		"react/jsx-dev-runtime",
	]);
	let ignore: boolean;

	return {
		name: "twitter-react-hijacker",
		enforce: "pre",
		configResolved(config) {
			ignore =
				typeof config.build.lib !== "boolean" &&
				config.build.lib.name === "_content"
					? false
					: JSON.stringify(config.build.rollupOptions.input ?? "").includes(
							"popup",
						) || config.command === "serve";
		},
		async resolveId(source, importer) {
			if (!SOURCES.has(source) || !importer || ignore) return null;
			return resolveMap[source];
		},
	};
};
