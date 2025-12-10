import { SelectDeckPopupRenderer } from "@/src/components/SelectDeckPopup";
import { waitForSelector } from "@/src/helpers/observer";
import { webpack } from "@/src/helpers/webpack";
import * as bippy from "bippy";

import "@/assets/root.css";
import { setBackgroundColor, setPrimaryColor } from "@/src/features/storage/kv";
import { matchers } from "@/src/helpers/matchers";

type ReactType = typeof import("react");
type ReactDOMType = typeof import("react-dom");
type ReactDOMClientType = typeof import("react-dom/client");
let React: ReactType;
let ReactDOM: ReactDOMType & ReactDOMClientType;

export default defineContentScript({
	matches: ["*://*.x.com/*"],
	world: "MAIN",
	main() {
		console.log("hello from content script!");

		const inject = () => {
			initializeWebpack();
			injectFiberObserver();
			injectTweetObserver();
			injectRenderers();
		};

		if (document.readyState === "complete") inject();
		else
			document.addEventListener("readystatechange", () => {
				if (document.readyState === "complete") inject();
			});
	},
});

const initializeWebpack = () => {
	console.log("loading webpack");
	webpack.load();

	const reactModule = webpack.findByProperty("useState");
	if (reactModule === undefined) throw new Error("failed to find React");
	React = reactModule.module as ReactType;
	console.log("webpack: found react");

	const reactDOMModule = webpack.findByProperty("createPortal");
	if (reactDOMModule === undefined) throw new Error("failed to find ReactDOM");
	ReactDOM = reactDOMModule.module as ReactDOMType & ReactDOMClientType;
	console.log("webpack: found reactDOM");

	const themeModule = webpack.findByProperty("_activeTheme", {
		maxDepth: 1,
	});
	if (themeModule === undefined)
		throw new Error("failed to find the theme module (_activeTheme)");

	type ThemeSample = {
		colors: Record<string, string>;
		primaryColorName: string;
	};
	// @ts-expect-error
	const theme = themeModule.module.Z as {
		_activeTheme: ThemeSample;
		_themeChangeListeners: ((newTheme: ThemeSample) => void)[];
	};

	theme._themeChangeListeners.push((th) => {
		setPrimaryColor(th.colors[th.primaryColorName]);
		setBackgroundColor(th.colors.navigationBackground);
	});

	const primaryColor =
		theme._activeTheme.colors[theme._activeTheme.primaryColorName];
	console.log(
		`found primary color: ${theme._activeTheme.primaryColorName} (${primaryColor})`,
	);
	setPrimaryColor(primaryColor);

	const bgColor = theme._activeTheme.colors.navigationBackground;
	console.log(`found background color: ${bgColor}`);
	setBackgroundColor(bgColor);
};

const injectRenderers = () => {
	console.log("renderers: injecting SelectDeckPopup");
	SelectDeckPopupRenderer.create();
};

const injectTweetObserver = () => {
	console.log("injecting tweet MutationObserver");

	const injectTweetCallbacks = async (tweet: Element) => {
		const bookmarkButton = (await waitForSelector(
			tweet,
			matchers.bookmarkButton.querySelector,
		)) as HTMLButtonElement;
		bookmarkButton.onclick = () => {
			bookmarkButton.getAttribute("data-testid") === "bookmark"
				? SelectDeckPopupRenderer.show(bookmarkButton)
				: SelectDeckPopupRenderer.hide();
		};
		//bookmarkButton.addEventListener("click", () => console.log("meow"));
	};

	const tweetObserver = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
				for (const node of mutation.addedNodes) {
					if (node.nodeType !== Node.ELEMENT_NODE) continue;
					for (const tweet of (node as HTMLElement).querySelectorAll(
						"article[data-testid=tweet]",
					))
						injectTweetCallbacks(tweet);
				}
			}
		}
	});
	tweetObserver.observe(document.body, { childList: true, subtree: true });
};

const injectFiberObserver = () => {
	console.log("injecting react fiber observer (bippy)");

	let found = false;
	bippy.instrument({
		onCommitFiberRoot: (id, root) => {
			bippy.traverseRenderedFibers(root.current, (fiber) => {
				if (bippy.getDisplayName(fiber) === "Tweet" && !found) {
					found = true;
					console.log("found tweet component");
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

								consale.log("rendering");
								ReactDOM.createRoot(
									document.querySelector("#testtweet"),
								).render(React.createElement(App));
								consale.log("success");

								 consale.log(ContextBridge);
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

							consale.log("render success?");
								//consale.log(type, "success??");
							} catch (err) {
								consale.error(err);
							} */
				}
			});
		},
	});
};
