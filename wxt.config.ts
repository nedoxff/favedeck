import * as child from "node:child_process";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
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
				source !== "react" &&
				source !== "react-dom" &&
				source !== "react-dom/client" &&
				source !== "react/jsx-runtime" &&
				source !== "react/jsx-dev-runtime"
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
	}),
	manifest: {
		host_permissions: ["*://*.x.com/*", "*://*.twitter.com/*"],
	},
	manifestVersion: 3,
});
