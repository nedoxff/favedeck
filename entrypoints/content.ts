import { webpack } from "@/src/helpers/webpack";
import * as bippy from "bippy";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";

export default defineContentScript({
	matches: ["*://*.x.com/*"],
	world: "MAIN",
	main() {
		console.log("hello from content script!");
		let found = false;
		webpack.load();
		const reactModule = webpack.findByProperty("createPortal");
		if (!reactModule) {
			console.error("couldn't find the webpack module containing react");
			return;
		}

		const react = reactModule.module as {
			createPortal: typeof createPortal;
			createRoot: typeof createRoot;
		};

		bippy.instrument({
			onCommitFiberRoot: (id, root) => {
				bippy.traverseFiber(root.current, (fiber) => {
					if (bippy.getDisplayName(fiber) === "Tweet" && !found) {
						found = true;
						console.log("found tweet", fiber);

						try {
							const contexts = bippy
								.getFiberStack(fiber)
								.filter((f) => typeof f.type === "object" && f.type !== null && f.type._context)
								.map((f) => f.type._context);
							console.log();

							const type = bippy.getType(fiber);
							const props = fiber.memoizedProps;
							react.createPortal(new type(), document.body);
							console.log(type, "success??");
						} catch (err) {
							console.error(err);
						}
					}
				});
			},
		});
	},
});
