import { SelectDeckPopupRenderer } from "@/src/components/SelectDeckPopup";
import { waitForSelector } from "@/src/helpers/observer";
import { webpack } from "@/src/helpers/webpack";
import * as bippy from "bippy";

import "@/assets/root.css";
import { DeckViewer } from "@/src/components/deck-viewer/DeckViewer";
import { colors } from "@/src/features/storage/kv";
import { matchers } from "@/src/helpers/matchers";

export default defineContentScript({
	matches: ["*://*.x.com/*"],
	world: "MAIN",
	main() {
		console.log("hello from content script!");
		window.dispatchEvent(new CustomEvent("fd-reset"));

		const inject = () => {
			initializeWebpack();
			injectUrlObserver();
			injectFiberObserver();
			injectTweetObserver();
			injectRenderers();
		};

		if (document.readyState === "complete") inject();
		else
			document.addEventListener("readystatechange", () => {
				if (document.readyState === "complete") inject();
			});

		window.addEventListener("fd-reset", () => {
			console.log("reloading");
			window.location.reload();
		});
	},
});

const injectUrlObserver = () => {
	console.log("injecting url observer");
	webpack.common.history.listen((location) => {
		if (location.pathname.endsWith("bookmarks"))
			queueMicrotask(DeckViewer.create);
		else queueMicrotask(DeckViewer.hide);
	});
	if (webpack.common.history._history.location.pathname.endsWith("bookmarks"))
		queueMicrotask(DeckViewer.create);
};

const initializeWebpack = () => {
	console.log("loading webpack");
	webpack.load();

	const themeModule = webpack.findByProperty("_activeTheme", {
		maxDepth: 1,
	});
	if (themeModule === undefined)
		throw new Error("failed to find the theme module (_activeTheme)");
	console.log("webpack: found the theme module");

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
		colors.primary.set(th.colors[th.primaryColorName]);
		colors.background.set(th.colors.navigationBackground);
		colors.mask.set(th.colors.maskColor);
		document.documentElement.style.setProperty(
			"--fd-primary",
			th.colors[th.primaryColorName],
		);
		document.documentElement.style.setProperty(
			"--fd-bg",
			th.colors.navigationBackground,
		);
		document.documentElement.style.setProperty(
			"--fd-mask",
			th.colors.maskColor,
		);
	});

	const primaryColor =
		theme._activeTheme.colors[theme._activeTheme.primaryColorName];
	const bgColor = theme._activeTheme.colors.navigationBackground;
	const maskColor = theme._activeTheme.colors.maskColor;

	colors.primary.set(primaryColor);
	colors.background.set(bgColor);
	colors.mask.set(maskColor);

	document.documentElement.style.setProperty("--fd-primary", primaryColor);
	document.documentElement.style.setProperty("--fd-bg", bgColor);
	document.documentElement.style.setProperty("--fd-mask", maskColor);

	console.log(
		`primary color: ${primaryColor} (${theme._activeTheme.primaryColorName})`,
	);
	console.log(`bg color: ${bgColor}`);
	console.log(`mask (modal) color: ${maskColor}`);
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

		// this could be an a11y nightmare...
		bookmarkButton.oncontextmenu = (ev) => {
			if (bookmarkButton.getAttribute("data-testid") === "removeBookmark") {
				ev.preventDefault();
				SelectDeckPopupRenderer.setBookmarkButton(bookmarkButton);
				SelectDeckPopupRenderer.show();
			}
		};
		bookmarkButton.onclick = () => {
			SelectDeckPopupRenderer.setBookmarkButton(bookmarkButton);
			bookmarkButton.getAttribute("data-testid") === "bookmark"
				? SelectDeckPopupRenderer.show()
				: SelectDeckPopupRenderer.hide(true);
		};
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
				if (
					typeof fiber.memoizedProps === "object" &&
					fiber.memoizedProps !== null &&
					"data-testid" in fiber.memoizedProps &&
					fiber.memoizedProps["data-testid"] === "primaryColumn"
				) {
					if (
						webpack.common.history._history.location.pathname.endsWith(
							"bookmarks",
						) &&
						fiber.stateNode instanceof HTMLElement &&
						document.querySelector("#favedeck-viewer") === null
					) {
						const div = document.createElement("div");
						div.id = "favedeck-viewer";
						fiber.stateNode.replaceChildren(div);
					}
				}

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
