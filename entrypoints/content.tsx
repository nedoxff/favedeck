import { webpack } from "@/src/helpers/webpack";
import * as bippy from "bippy";

type ReactType = typeof import("react");
type ReactDOMType = typeof import("react-dom");
type ReactDOMClientType = typeof import("react-dom/client");
let React: ReactType;
let ReactDOM: ReactDOMType & ReactDOMClientType;

export default defineContentScript({
	matches: ["*://*.x.com/*"],
	world: "MAIN",
	main() {
		//window.__FAVEDECK_OVERRIDES.onBookmark = () => console.log("MEOW");

		setTimeout(() => {
			console.log("hello from content script!");
			const found = false;
			webpack.load();
			window.wp = webpack;

			React = webpack.findByProperty("useState")?.module as ReactType;
			ReactDOM = webpack.findByProperty("createPortal")
				?.module as ReactDOMType & ReactDOMClientType;
			console.log(React, ReactDOM);

			bippy.instrument({
				onCommitFiberRoot: (id, root) => {
					bippy.traverseRenderedFibers(root.current, (fiber) => {
						if (bippy.getDisplayName(fiber) === "Tweet" && !found) {
							console.log("found tweet", fiber);
							bippy.traverseRenderedFibers(fiber, (f) => {
								let matches = false;
								bippy.traverseProps(f, (name) => {
									if (name.toLowerCase().includes("bookmark"))
										console.log(name);
									if (matches) return false;
									if (name === "isBookmarked") matches = true;
								});
								if (matches) {
									bippy.overrideProps(f, {
										onPress: () => console.error("meow"),
										color: "red700",
									});
									console.error("teehee", f);
									return true;
								}
								return false;
							});
							/* try {
								const contexts = bippy
									.getFiberStack(fiber)
									.filter(
										(f) =>
											typeof f.type === "object" &&
											f.type !== null &&
											"value" in f.memoizedProps &&
											f.type._context,
									)
									.map((f) => ({
										context: f.type._context,
										value: f.memoizedProps.value,
									}));

								const type = bippy.getType(fiber);
								const props = fiber.memoizedProps;

								const ContextBridge = contexts.reduceRight<React.ReactNode>(
									(acc, cur) => {
										return React.createElement(
											cur.context.Provider,
											{ value: cur.value },
											acc,
										);
									},
									React.createElement(type, { ...props }),
								);

								const App = () => ContextBridge;

								console.log("rendering");
								ReactDOM.createRoot(
									document.querySelector("#testtweet"),
								).render(React.createElement(App));
								console.log("success");

								 console.log(ContextBridge);
							const portal = react.createPortal(
								React.createElement("input"),
								document.querySelector("#testtweet"),
							);
							console.log(portal);
								/* console.log(
								"eb",
								React.createElement(ErrorBoundary, {}, ContextBridge),
							);
							flushSync(() => {
								react
									.createRoot(document.querySelector("#testtweet"))
									.render(<ContextBridge></ContextBridge>);
							});

							console.log("render success?");
								//console.log(type, "success??");
							} catch (err) {
								console.error(err);
							} */
						}
					});
				},
			});
		}, 0);
	},
});
