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
				source !== "react/jsx-runtime"
			)
				return null;

			if (importer?.includes("react-virtuoso")) {
				console.log(`hijacking ${source} import from ${importer}`);

				switch (source) {
					case "react":
						return path.resolve(
							__dirname,
							"src/internals/proxies/react-proxy.ts",
						);
					case "react-dom":
						return path.resolve(
							__dirname,
							"src/internals/proxies/react-dom-proxy.ts",
						);
					case "react/jsx-runtime":
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
	// @ts-expect-error
	vite: () => ({
		plugins: [twitterReactHijacker(), tailwindcss()],
	}),
	manifest: {
		permissions: ["cookies", "storage"],
		host_permissions: ["https://x.com", "https://api.x.com"],
	},
});
