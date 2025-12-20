import tailwindcss from "@tailwindcss/vite";
import path from "path";
import type { Plugin } from "vite";
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
		plugins: [twitterReactHijacker(), tailwindcss()],
	}),
	manifest: {
		host_permissions: ["*://*.x.com/*", "*://*.twitter.com/*"],
	},
});
