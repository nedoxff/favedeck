import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
	modules: ["@wxt-dev/module-react"],
	// @ts-expect-error
	vite: () => ({
		plugins: [tailwindcss()],
	}),
});
