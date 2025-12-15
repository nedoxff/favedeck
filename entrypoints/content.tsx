import { SelectDeckPopupRenderer } from "@/src/components/SelectDeckPopup";
import { waitForSelector } from "@/src/helpers/observer";
import { webpack } from "@/src/internals/webpack";
import * as bippy from "bippy";

import "@/assets/root.css";
import { DeckViewer } from "@/src/components/deck-viewer/DeckViewer";
import { getTweetComponentsFromFiber } from "@/src/components/Tweet";
import { colors, decks } from "@/src/features/storage/kv";
import { matchers } from "@/src/internals/matchers";
import { setReduxStoreFromFiber } from "@/src/internals/redux";

export default defineContentScript({
	matches: ["*://*.x.com/*"],
	world: "MAIN",
	main() {
		console.log("hello from content script!");
		window.dispatchEvent(new CustomEvent("fd-reset"));

		const inject = () => {
			initializeWebpack();
			injectFiberObserver();
			injectUrlObserver();
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
	webpack.common.history.listen((location, action) => {
		const shouldCreateViewer =
			location.pathname.endsWith("bookmarks") &&
			!(webpack.common.history._locationsHistory.at(-1)?.isModalRoute ?? false);
		console.log("should create DeckViewer:", shouldCreateViewer);
		if (shouldCreateViewer) queueMicrotask(DeckViewer.create);
	});
	if (webpack.common.history._history.location.pathname.endsWith("bookmarks"))
		queueMicrotask(DeckViewer.create);
	else decks.currentDeck.set(undefined);
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

				if (
					SelectDeckPopupRenderer.getBookmarkButton() === bookmarkButton &&
					SelectDeckPopupRenderer.getVisible()
				)
					SelectDeckPopupRenderer.hide();
				else {
					SelectDeckPopupRenderer.setBookmarkButton(bookmarkButton);
					SelectDeckPopupRenderer.show();
				}
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
	let reduxFiber: bippy.Fiber | null;
	bippy.instrument({
		onCommitFiberRoot: (id, root) => {
			bippy.traverseRenderedFibers(root.current, (fiber) => {
				if (!reduxFiber) {
					reduxFiber = bippy.traverseFiber(
						fiber,
						(f) =>
							Object.hasOwn(f.memoizedProps ?? {}, "store") &&
							Object.hasOwn(f.memoizedProps ?? {}, "jotaiStore"),
						true,
					);
					if (reduxFiber) {
						console.log("found fiber with the redux store");
						setReduxStoreFromFiber(reduxFiber);
					}
				}

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
						fiber.stateNode.style.position = "relative";
						const container = fiber.stateNode.childNodes[0] as HTMLElement;
						container.style.position = "absolute";
						container.style.pointerEvents = "none";
						container.style.opacity = "0";
						container.style.zIndex = "-1000";
						container.style.maxHeight = "100vh";
						container.style.overflowY = "hidden";

						const div = document.createElement("div");
						div.id = "favedeck-viewer";
						fiber.stateNode.prepend(div);
					}
				}

				if (fiber.key?.startsWith("tweet") && !found) {
					found = true;
					console.log("found the tweet component");
					getTweetComponentsFromFiber(fiber);
				}
			});
		},
	});
};
