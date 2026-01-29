import * as child from "node:child_process";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import icons from "unplugin-icons/vite";
import type { Plugin } from "vite";
import svgr from "vite-plugin-svgr";
import { defineConfig } from "wxt";

const twitterReactHijacker = (): Plugin => {
	return {
		name: "twitter-react-hijacker",
		enforce: "pre",
		resolveId(source, importer) {
			if (
				![
					"react",
					"react-dom",
					"react-dom/client",
					"react/jsx-runtime",
					"react/jsx-dev-runtime",
				].includes(source)
			)
				return null;

			if (!importer?.includes("popup")) {
				console.log(`hijacking ${source} import from ${importer}`);

				switch (source) {
					case "react":
						return path.resolve(
							__dirname,
							"src/internals/proxies/react-proxy.ts",
						);
					case "react-dom":
					case "react-dom/client":
						return path.resolve(
							__dirname,
							"src/internals/proxies/react-dom-proxy.ts",
						);
					case "react/jsx-runtime":
					case "react/jsx-dev-runtime":
						return path.resolve(
							__dirname,
							"src/internals/proxies/react-jsx-runtime-proxy.ts",
						);
				}
			}
			return null;
		},
	};
};

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
		host_permissions: ["*://*.x.com/*", "*://*.twitter.com/*"],
		web_accessible_resources: [{ resources: ["img/**"], matches: ["*://*/*"] }],
	},
	manifestVersion: 3,
});
