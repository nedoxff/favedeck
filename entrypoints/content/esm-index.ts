import { getTweetComponentsFromFiber } from "@/src/components/external/Tweet";
import { components, initializeComponents } from "@/src/components/wrapper";
import { kv } from "@/src/features/storage/kv";
import {
	type ForwarderMessagePayload,
	isFromPostMessage,
	sendContentToForwarder,
} from "@/src/helpers/messaging";
import { waitForSelector } from "@/src/helpers/observer";
import { getRootNodeFromTweetElement } from "@/src/internals/goodies";
import { matchers } from "@/src/internals/matchers";
import { setReduxStoreFromFiber } from "@/src/internals/redux";
import { webpack } from "@/src/internals/webpack";
import * as bippy from "bippy";

const initializeMessageListener = () => {
	window.addEventListener("message", (ev) => {
		if (!isFromPostMessage(ev.data)) return;
		const payload = ev.data as ForwarderMessagePayload;
		switch (payload.type) {
			case "hello-acknowledge":
				break;
			case "request-state":
				break;
		}
	});
	sendContentToForwarder({
		source: "favedeck",
		type: "hello",
	});
};

const injectUrlObserver = () => {
	console.log("injecting url observer");
	webpack.common.history.listen((location, _action) => {
		const previousRoute = webpack.common.history._locationsHistory.at(-1);
		const shouldCreateViewer =
			location.pathname.endsWith("bookmarks") &&
			!components.DeckViewer.isMounted &&
			!(previousRoute?.isModalRoute ?? false);
		console.log("should create DeckViewer:", shouldCreateViewer);
		if (shouldCreateViewer) components.DeckViewer.create();
	});

	const initialRoute = webpack.common.history._locationsHistory.find(
		(l) => l.locationKey === "initialRwebLocationKey",
	);
	if (
		webpack.common.history._history.location.pathname.endsWith("bookmarks") ||
		initialRoute?.locationPathname.endsWith("bookmarks")
	)
		queueMicrotask(components.DeckViewer.create);
	else kv.decks.currentDeck.set(undefined);
};

const initializeWebpack = async () => {
	console.log("loading webpack");
	webpack.load();
	await initializeComponents();

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
		document.documentElement.style.setProperty("--fd-danger", th.colors.red500);
	});

	const primaryColor =
		theme._activeTheme.colors[theme._activeTheme.primaryColorName];
	const bgColor = theme._activeTheme.colors.navigationBackground;
	const maskColor = theme._activeTheme.colors.maskColor;
	const dangerColor = theme._activeTheme.colors.red500;

	document.documentElement.style.setProperty("--fd-primary", primaryColor);
	document.documentElement.style.setProperty("--fd-bg", bgColor);
	document.documentElement.style.setProperty("--fd-mask", maskColor);
	document.documentElement.style.setProperty("--fd-danger", dangerColor);

	console.log(
		`primary color: ${primaryColor} (${theme._activeTheme.primaryColorName})`,
	);
	console.log(`bg color: ${bgColor}`);
	console.log(`mask (modal) color: ${maskColor}`);
	console.log(`danger color: ${dangerColor}`);
};

const injectTweetObserver = () => {
	console.log("injecting tweet MutationObserver");

	const injectTweetCallbacks = async (tweet: HTMLElement) => {
		if ("favedeck" in tweet.dataset) return;
		tweet.dataset.favedeck = "injected";

		const bookmarkButton = (await waitForSelector(
			tweet,
			matchers.bookmarkButton.querySelector,
		)) as HTMLButtonElement;

		bookmarkButton.addEventListener(
			"click",
			(ev) => {
				if (bookmarkButton.getAttribute("data-testid") === "removeBookmark") {
					ev.stopPropagation();
					ev.stopImmediatePropagation();
					ev.preventDefault();
				}
				if (
					components.SelectDeckPopup.initiator === bookmarkButton &&
					bookmarkButton.getAttribute("data-testid") === "removeBookmark"
				)
					components.SelectDeckPopup.hide();
				else components.SelectDeckPopup.show(bookmarkButton, "tweet");
			},
			true,
		);
	};

	const tweetObserver = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
				for (const node of mutation.addedNodes) {
					if (!(node instanceof HTMLElement)) continue;
					for (const tweetNode of (node as HTMLElement).querySelectorAll(
						"article[data-testid=tweet]",
					)) {
						const tweet = tweetNode as HTMLElement;
						injectTweetCallbacks(tweet);

						if (components.DeckViewer.isMounted) {
							const info = getRootNodeFromTweetElement(tweet);
							if (!info) continue;
							components.DeckViewer.checkUngroupedTweet(info.rootNode, info.id);
						}
					}
				}
			} else {
				const tweetNode = (mutation.target as HTMLElement).querySelector(
					matchers.tweet.querySelector,
				);
				if (!tweetNode) continue;
				const computedDisplay = getComputedStyle(tweetNode).display;
				if (computedDisplay === "flex")
					injectTweetCallbacks(tweetNode as HTMLElement);
			}
		}
	});
	tweetObserver.observe(document.body, {
		childList: true,
		subtree: true,
		attributes: true,
		attributeFilter: ["style"],
	});
};

const injectFiberObserver = () => {
	console.log("injecting react fiber observer (bippy)");
	let found = false;
	let reduxFiber: bippy.Fiber | null;
	bippy.instrument({
		onCommitFiberRoot: (_id, root) => {
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
						components.DeckViewer.originalContainer.set(container);

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

console.log("hello from esm content script!");

(async () => {
	const reloaded = await kv.reloaded.get();
	if (reloaded === "true") {
		await kv.reloaded.set(undefined);
		window.location.reload();
	}
})();

const inject = async () => {
	await initializeWebpack();
	injectFiberObserver();
	injectUrlObserver();
	injectTweetObserver();
	initializeMessageListener();
};

if (document.readyState === "complete") inject();
else
	document.addEventListener("readystatechange", () => {
		if (document.readyState === "complete") inject();
	});
