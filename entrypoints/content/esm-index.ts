import { Result } from "better-result";
import * as bippy from "bippy";
import { memoize } from "micro-memoize";
import { getTweetComponentsFromFiber } from "@/src/components/external/Tweet";
import { components, initializeComponents } from "@/src/components/wrapper";
import { decksEventTarget } from "@/src/features/events/decks";
import { internalsEventTarget } from "@/src/features/events/internals";
import { kv } from "@/src/features/storage/kv";
import { DEFAULT_SETTINGS } from "@/src/features/storage/settings";
import { websiteMessenger } from "@/src/helpers/messaging-content";
import { createTweetObserver, waitForSelector } from "@/src/helpers/observer";
import {
	EXTENSION_GROUP_ERROR,
	EXTENSION_GROUP_OK,
	type ExtensionDebugInfo,
	extensionState,
	type GroupState,
	getRawExtensionState,
} from "@/src/helpers/state";
import { getRootNodeFromTweetElement } from "@/src/internals/goodies";
import { matchers } from "@/src/internals/matchers";
import {
	type ReduxDispatchAction,
	setReduxStoreFromFiber,
} from "@/src/internals/redux";
import {
	type ReduxBookmarksTimelineAPIType,
	webpack,
} from "@/src/internals/webpack";

const initializeMessageListener = () =>
	Result.try(() => {
		websiteMessenger.onMessage("syncPopup", () => {
			const getDebugInfo = (): ExtensionDebugInfo => {
				if (!window.__META_DATA__)
					return { reactVersion: webpack.common.react.React.version };

				const { cookies, tags, ...globalMetadata } = window.__META_DATA__;
				return {
					reactVersion: webpack.common.react.React.version,
					globalMetadata,
				};
			};

			return {
				debugInfo: getDebugInfo(),
				state: getRawExtensionState(),
				theme: {
					...webpack.common.theme._activeTheme,
					chirpFontStylesheet: findChirpFontStylesheet(),
				},
			};
		});
	});

const findChirpFontStylesheet = memoize(() => {
	const stylesheet = Array.from(document.styleSheets).find((sheet) =>
		Array.from(sheet.cssRules).some((rule) =>
			rule.cssText.startsWith("@font-face { font-family: TwitterChirp;"),
		),
	);
	return stylesheet
		? Array.from(stylesheet.cssRules)
				.map((rule) => rule.cssText)
				.join("\n")
		: undefined;
});

const injectUrlObserver = () =>
	Result.try(() => {
		console.log("injecting url observer");
		webpack.common.history.listen((location, _action) => {
			overrideBookmarksTimelineActions();
			if (
				location.pathname.endsWith("bookmarks") &&
				components.DeckViewer.isMounted
			) {
				decksEventTarget.setCurrentDeck(
					location.hash && location.hash.length !== 0
						? location.hash.substring(4)
						: null,
				);
				return;
			}

			const previousRoute = webpack.common.history._locationsHistory.at(-1);
			console.log(location, components.DeckViewer, previousRoute);
			console.log(
				location.pathname.endsWith("bookmarks"),
				!components.DeckViewer.isMounted,
				!(previousRoute?.isModalRoute ?? false),
			);
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

		const hash = webpack.common.history._history.location.pathname.endsWith(
			"bookmarks",
		)
			? (webpack.common.history._history.location.hash ?? null)
			: initialRoute?.locationPathname.endsWith("bookmarks")
				? new URL(initialRoute?.locationPathname).hash
				: null;

		if (hash !== null) {
			decksEventTarget.setCurrentDeck(
				hash.length === 0 ? null : hash.substring(4),
			);
			queueMicrotask(components.DeckViewer.create);
		}

		overrideBookmarksTimelineActions();
	});

const overrideBookmarksTimelineActions = (() => {
	let overridden = false;
	return () => {
		if (overridden || !webpack.common.redux.api.bookmarksTimeline) return;
		overridden = true;

		const overrideReduxAction = <T extends Record<string, unknown>>(
			obj: T,
			path: keyof T,
			options?: {
				before?: () => void;
				after?: (value: unknown) => void;
			},
		) => {
			if (!obj[path] || typeof obj[path] !== "function") return;
			obj[path] = new Proxy(obj[path], {
				apply(target, that, args) {
					const originalAction = Reflect.apply(target, that, args);
					return ((dispatch, getState) => {
						options?.before?.();
						const value = originalAction(dispatch, getState);
						Promise.resolve(value).then(options?.after);
						return value;
					}) as ReduxDispatchAction;
				},
			});
		};

		if (webpack.common.redux.api.bookmarksTimeline) {
			for (const key of [
				"fetchBottom",
				"fetchCursor",
				"fetchTop",
				"fetchInitialOrTop",
			])
				overrideReduxAction(
					webpack.common.redux.api.bookmarksTimeline,
					key as keyof ReduxBookmarksTimelineAPIType,
					{
						after: (value) => {
							// only notify if it actually happened
							if (
								value &&
								typeof value === "object" &&
								"performed" in value &&
								value.performed === true
							)
								internalsEventTarget.dispatchBookmarksTimelineFetched();
						},
					},
				);
		}
	};
})();

const initializeWebpack = async () =>
	await Result.gen(async function* () {
		console.log("loading webpack");
		yield* webpack.load();
		await initializeComponents();

		const theme = webpack.common.theme;
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
			document.documentElement.style.setProperty(
				"--fd-danger",
				th.colors.red500,
			);

			websiteMessenger.sendMessage("syncIcon", th.colors[th.primaryColorName]);
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

		websiteMessenger.sendMessage("syncIcon", primaryColor);
		return Result.ok();
	});

const injectTweetObserver = () =>
	Result.try(() => {
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
					if (bookmarkButton.dataset.testid === "removeBookmark") {
						ev.stopPropagation();
						ev.stopImmediatePropagation();
						ev.preventDefault();
					}
					if (
						components.SelectDeckPopup.initiator === bookmarkButton &&
						bookmarkButton.dataset.testid === "removeBookmark"
					)
						components.SelectDeckPopup.hide();
					else components.SelectDeckPopup.show(bookmarkButton, "tweet");
				},
				true,
			);
		};

		const handleTweet = (tweet: HTMLElement) => {
			injectTweetCallbacks(tweet as HTMLElement);
			if (components.DeckViewer.isMounted) {
				const info = getRootNodeFromTweetElement(tweet);
				if (!info) return;
				components.DeckViewer.checkTweet(info.rootNode, info.id);
			}
		};

		createTweetObserver(handleTweet);
		components.DeckViewer.on("mounted", () => {
			console.log("DeckViewer mounted, rechecking tweets");
			for (const tweet of document.querySelectorAll<HTMLElement>(
				matchers.tweet.querySelector,
			))
				handleTweet(tweet);
		});

		// the fiber observer might not always find the primary column, especially
		// if loading the page without cache. so, if it's too late, we just find it in the DOM
		// and do the same checks
		const primaryColumn = document.querySelector<HTMLDivElement>(
			"div[data-testid='primaryColumn']",
		);
		if (primaryColumn) checkPrimaryColumn(primaryColumn);
	});

const checkPrimaryColumn = (el: HTMLElement) => {
	if (
		!webpack.common.history._history.location.pathname.endsWith("bookmarks") ||
		document.querySelector("#favedeck-viewer") !== null
	)
		return;
	el.style.position = "relative";
	components.DeckViewer.originalContainer.value = el
		.childNodes[0] as HTMLElement;

	const div = document.createElement("div");
	div.id = "favedeck-viewer";
	el.prepend(div);
};

const injectFiberObserver = () =>
	Result.try(() => {
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
							extensionState.redux = EXTENSION_GROUP_OK;
						}
					}

					if (
						typeof fiber.memoizedProps === "object" &&
						fiber.memoizedProps !== null &&
						"data-testid" in fiber.memoizedProps &&
						fiber.memoizedProps["data-testid"] === "primaryColumn" &&
						fiber.stateNode instanceof HTMLElement
					)
						checkPrimaryColumn(fiber.stateNode as HTMLElement);

					if (fiber.key?.startsWith("tweet") && !found) {
						found = true;
						console.log("found the tweet component");
						extensionState.tweetComponent = getTweetComponentsFromFiber(
							fiber,
						).match({
							ok: () => EXTENSION_GROUP_OK,
							err: EXTENSION_GROUP_ERROR,
						});
					}
				});
			},
		});
	});
console.log("hello from esm content script!");

(async () => {
	const reloaded = await kv.reloaded.get();
	if (reloaded === "true") {
		await kv.reloaded.set(undefined);
		window.location.reload();
	}

	const settings = await kv.settings.get();
	if (!settings) await kv.settings.set(DEFAULT_SETTINGS);
})();

const inject = async () => {
	const mapResult = <A, E>(result: Result<A, E>): GroupState =>
		result.match({
			ok: () => EXTENSION_GROUP_OK,
			err: EXTENSION_GROUP_ERROR,
		});

	extensionState.webpack = mapResult(await initializeWebpack());
	extensionState.messageListener = mapResult(initializeMessageListener());
	extensionState.fiberObserver = mapResult(injectFiberObserver());
	extensionState.urlObserver = mapResult(injectUrlObserver());
	extensionState.tweetObserver = mapResult(injectTweetObserver());
};

if (document.readyState === "complete") inject();
else
	document.addEventListener("readystatechange", () => {
		if (document.readyState === "complete") inject();
	});
