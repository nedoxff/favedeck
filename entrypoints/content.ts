import * as bippy from "bippy";

const loadWebpack = () => {
	try {
		const require = window.webpackChunk_twitter_responsive_web.push([
			[Symbol()],
			{},
			(re) => re,
		]);
		window.req = require;
		const cache = Object.keys(require.m)
			.map((id) => {
				try {
					return require(id);
				} catch (ex) {
					console.error(ex);
					return -1;
				}
			})
			.filter((i) => i !== -1);
		const modules = cache
			.filter((module) => typeof module === "object")
			.flatMap((module) => {
				try {
					if ("createPortal" in module) console.log(module);
					return Object.values(module);
				} catch {
					console.error(module);
				}
			});
		return { cache, modules };
	} catch (error) {
		console.error("Failed to load webpack", error);
		return { cache: [], functionModules: [] };
	}
};

export default defineContentScript({
	matches: ["*://*.x.com/*"],
	world: "MAIN",
	main() {
		console.log("hello from content script!");
		let found = false;
		console.log(loadWebpack());
		bippy.instrument({
			onCommitFiberRoot: (id, root) => {
				bippy.traverseFiber(root.current, (fiber) => {
					if (bippy.getDisplayName(fiber) === "Tweet" && !found) {
						found = true;
						console.log("found tweet", fiber);

						const type = fiber.type;
						const props = fiber.memoizedProps;
						const host = bippy.getNearestHostFiber(fiber)?.stateNode as
							| HTMLElement
							| undefined;
						if (!host || !host.parentElement) return;
					}
				});
			},
		});
	},
});
