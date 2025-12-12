import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

export default defineConfig({
	modules: ["@wxt-dev/module-react"],
	vite: () => ({
		plugins: [tailwindcss()],
	}),
	manifest: {
		permissions: ["cookies", "storage"],
		host_permissions: ["https://x.com", "https://api.x.com"],
	},
});
