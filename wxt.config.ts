import * as child from "node:child_process";
import * as fs from "node:fs/promises";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import icons from "unplugin-icons/vite";
import type { Plugin, ViteDevServer } from "vite";
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
	},
	manifestVersion: 3,
});

const twitterReactHijacker = async (): Promise<Plugin> => {
	let devServer: ViteDevServer | undefined;
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

	return {
		name: "twitter-react-hijacker",
		enforce: "pre",
		configureServer(server) {
			devServer = server;
		},
		resolveId(source, importer) {
			if (!SOURCES.has(source)) return null;
			if (!importer) return null;

			if (importer.includes("popup")) return null;
			if (devServer) {
				const module = devServer.moduleGraph.getModuleById(importer);
				for (const parent of module?.importers ?? [])
					if ((parent.id ?? "").includes("popup")) return null;
			} else {
				const moduleInfo = this.getModuleInfo(importer);
				for (const parentImporter of moduleInfo?.importers ?? [])
					if (parentImporter.includes("popup")) return null;
			}

			return resolveMap[source];
		},
	};
};
