import { Result, type UnhandledException } from "better-result";
import * as bippy from "bippy";
import { getProperty } from "dot-prop";
import { memoize } from "micro-memoize";
import { getTweetComponentsFromFiber } from "@/src/components/external/Tweet";
import { components, initializeComponents } from "@/src/components/wrapper";
import { decksEventTarget } from "@/src/features/events/decks";
import { internalsEventTarget } from "@/src/features/events/internals";
import { kv } from "@/src/features/storage/kv";
import { DEFAULT_SETTINGS, getSetting } from "@/src/features/storage/settings";
import { ignoreErrors, type WebpackNotFoundError } from "@/src/helpers/errors";
import { websiteMessenger } from "@/src/helpers/messaging/content";
import { createTweetObserver, waitForSelector } from "@/src/helpers/observer";
import {
	EXTENSION_GROUP_ERROR,
	EXTENSION_GROUP_OK,
	extensionState,
	type GroupState,
	getRawExtensionState,
} from "@/src/helpers/state";
import { getDebugInfo } from "@/src/internals/foolproof";
import { getRootNodeFromTweetElement } from "@/src/internals/goodies";
import { matchers } from "@/src/internals/matchers";
import {
	fallbackTimelines,
	type ReduxDispatchAction,
	setReduxStoreFromFiber,
} from "@/src/internals/redux";
import { type ReduxTimelineAPIType, webpack } from "@/src/internals/webpack";
import type { AutoBackupResponseMessage } from "@/src/isolated-or-background/auto-backup/root";

const initializeMessageListener = () =>
	Result.try(() => {
		websiteMessenger.onMessage("syncPopup", () => {
			return {
				debugInfo: getDebugInfo(),
				state: getRawExtensionState(),
				theme: webpack.common
					? {
							...webpack.common.theme._activeTheme,
							chirpFontStylesheet: findChirpFontStylesheet(),
						}
					: undefined,
			};
		});

		websiteMessenger.onMessage("autoBackup:receive", (message) =>
			internalsEventTarget.dispatchAutoBackupMessage(message.data),
		);

		const initialBackupListener = (
			event: CustomEvent<AutoBackupResponseMessage>,
		) => {
			if (event.detail.type !== "receiveTimestamp") return;
			const handle = async (timestamp: number) => {
				const preference = await getSetting("autoBackupPreference");
				if (preference === "disabled") return;

				if (timestamp === -1) {
					components.BackupDetectedModal.performAutoBackup();
					return;
				}

				const lastTimestamp = await kv.lastBackupTimestamp.get();
				if (!lastTimestamp) {
					components.BackupDetectedModal.show(timestamp);
					return;
				}

				const changesSinceLastBackup =
					(await kv.changesSinceLastBackup.get()) ?? false;
				const factualDifference = timestamp - lastTimestamp;
				const requiredDifference =
					1000 *
					60 *
					60 *
					(preference === "hour" ? 1 : preference === "day" ? 24 : 24 * 7);
				if (factualDifference >= requiredDifference && changesSinceLastBackup)
					components.BackupDetectedModal.performAutoBackup();
			};

			handle(event.detail.data).then(() =>
				internalsEventTarget.removeEventListener(
					"auto-backup-message",
					initialBackupListener,
				),
			);
		};
		internalsEventTarget.addEventListener(
			"auto-backup-message",
			initialBackupListener,
		);

		ignoreErrors(() =>
			websiteMessenger.sendMessage("autoBackup:forward", {
				type: "requestTimestamp",
				data: {},
			}),
		);
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
		webpack.common.history.listen((location, action) =>
			queueMicrotask(() => {
				overrideBookmarksTimelineActions();
				if (
					location.pathname.includes("history") &&
					components.DeckViewer.isMounted
				) {
					decksEventTarget.setCurrentDeck(
						location.hash && location.hash.length !== 0
							? location.hash.substring(4)
							: null,
					);
					return;
				}

				const isPreviousRouteModal = (() => {
					const index = webpack.common.history._locationsHistory.findIndex(
						(l) => l.locationKey === location.key,
					);
					// default: false
					if (index === -1) return false;
					const previous = webpack.common.history._locationsHistory.at(
						index + (action === "POP" ? 1 : -1),
					);
					return previous?.isModalRoute;
				})();

				const shouldCreateViewer =
					location.pathname.includes("history") &&
					!components.DeckViewer.isMounted &&
					!isPreviousRouteModal;
				console.log(
					"should create DeckViewer:",
					location.pathname.includes("history"),
					'(path ends with "history") &&',
					!components.DeckViewer.isMounted,
					"(DeckViewer is NOT mounted) &&",
					!isPreviousRouteModal,
					"(previous route is NOT modal) ==",
					shouldCreateViewer,
				);
				if (shouldCreateViewer)
					components.DeckViewer.create(
						location.pathname.endsWith("history/likes") ? "likes" : "bookmarks",
					);
			}),
		);

		const initialRoute = webpack.common.history._locationsHistory.find(
			(l) => l.locationKey === "initialRwebLocationKey",
		);

		const hash = webpack.common.history._history.location.pathname.includes(
			"history",
		)
			? (webpack.common.history._history.location.hash ?? null)
			: initialRoute?.locationPathname.includes("history")
				? new URL(initialRoute?.locationPathname).hash
				: null;

		if (hash !== null) {
			decksEventTarget.setCurrentDeck(
				hash.length === 0 ? null : hash.substring(4),
			);
			queueMicrotask(() =>
				components.DeckViewer.create(
					location.pathname.endsWith("history/likes") ? "likes" : "bookmarks",
				),
			);
		}

		overrideBookmarksTimelineActions();
	});

const overrideBookmarksTimelineActions = (() => {
	let overriddenBookmarks = false;
	let overriddenLikes = false;
	return () => {
		if (overriddenBookmarks && overriddenLikes) return;

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

		const applyForTimeline = (timeline: "bookmarks" | "likes") => {
			const provider =
				timeline === "bookmarks"
					? webpack.common.redux.api.bookmarksTimeline
					: webpack.common.redux.api.favoritesTimeline;
			if (provider) {
				for (const key of [
					"fetchBottom",
					"fetchCursor",
					"fetchTop",
					"fetchInitialOrTop",
				])
					overrideReduxAction(provider, key as keyof ReduxTimelineAPIType, {
						after: (value) => {
							// only notify if it actually happened
							if (getProperty(value, "performed") === true)
								internalsEventTarget.dispatchTimelineFetched();
						},
					});
				if (timeline === "bookmarks") overriddenBookmarks = true;
				else overriddenLikes = true;
			}
		};

		applyForTimeline("bookmarks");
		applyForTimeline("likes");
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
			document.documentElement.style.setProperty("--fd-fg", th.colors.text);
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
		const fgColor = theme._activeTheme.colors.text;
		const maskColor = theme._activeTheme.colors.maskColor;
		const dangerColor = theme._activeTheme.colors.red500;
		const borderColor = theme._activeTheme.colors.borderColor;

		document.documentElement.style.setProperty("--fd-primary", primaryColor);
		document.documentElement.style.setProperty("--fd-bg", bgColor);
		document.documentElement.style.setProperty("--fd-fg", fgColor);
		document.documentElement.style.setProperty("--fd-mask", maskColor);
		document.documentElement.style.setProperty("--fd-danger", dangerColor);
		document.documentElement.style.setProperty("--fd-border", borderColor);

		console.log("colors", {
			primaryColor,
			bgColor,
			fgColor,
			maskColor,
			dangerColor,
			borderColor,
		});

		websiteMessenger.sendMessage("syncIcon", primaryColor);
		return Result.ok();
	});

const injectTweetObserver = () =>
	Result.try(() => {
		console.log("injecting tweet MutationObserver");

		const injectTweetCallbacks = async (tweet: HTMLElement) => {
			if ("favedeck" in tweet.dataset) return;
			tweet.dataset.favedeck = "injected";
			const injectLikes = await getSetting("showDeckPopupForLikes");

			await Promise.all([
				(async () => {
					const bookmarkButton = (await waitForSelector(
						tweet,
						matchers.bookmarkButton.querySelector,
						5000,
					)) as HTMLButtonElement | undefined;
					if (!bookmarkButton) return;

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
							else
								components.SelectDeckPopup.show(
									bookmarkButton,
									"bookmarks",
									"tweet",
								);
						},
						true,
					);
				})(),
				(async () => {
					const likeButton = (await waitForSelector(
						tweet,
						matchers.likeButton.querySelector,
						5000,
					)) as HTMLButtonElement | undefined;
					if (!likeButton) return;

					likeButton.addEventListener(
						"click",
						(ev) => {
							if (!injectLikes && decksEventTarget.currentDeck !== "all-likes")
								return;
							if (likeButton.dataset.testid === "unlike") {
								ev.stopPropagation();
								ev.stopImmediatePropagation();
								ev.preventDefault();
							}
							if (
								components.SelectDeckPopup.initiator === likeButton &&
								likeButton.dataset.testid === "unlike"
							)
								components.SelectDeckPopup.hide();
							else
								components.SelectDeckPopup.show(likeButton, "likes", "tweet");
						},
						true,
					);
				})(),
			]);
		};

		const handleTweet = (tweet: HTMLElement) => {
			injectTweetCallbacks(tweet as HTMLElement);
			if (components.DeckViewer.isMounted) {
				const info = getRootNodeFromTweetElement(tweet);
				if (info.isErr()) return;
				components.DeckViewer.checkTweet(info.value.rootNode, info.value.id);
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
	if (!webpack.common.history._history.location.pathname.includes("history"))
		return;

	const viewerUnmounted =
		components.DeckViewer.originalContainer.value &&
		!components.DeckViewer.isMounted;
	if (viewerUnmounted || !components.DeckViewer.originalContainer.value) {
		el.style.position = "relative";
		components.DeckViewer.originalContainer.value = el
			.childNodes[0] as HTMLElement;

		const div = document.createElement("div");
		div.classList.add("favedeck-root");
		div.id = "favedeck-viewer";
		el.prepend(div);
	}
	if (viewerUnmounted)
		components.DeckViewer.create(components.DeckViewer.category);
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
							extensionState.groups.redux = EXTENSION_GROUP_OK;
						}
					}

					if (
						Object.hasOwn(fiber.memoizedProps ?? {}, "module") &&
						Object.hasOwn(fiber.memoizedProps.module ?? {}, "timelineId")
					) {
						const module = fiber.memoizedProps.module as ReduxTimelineAPIType;
						if (
							module.perfKey === "bookmarksGraphQL" &&
							!fallbackTimelines.bookmarksTimeline
						) {
							console.log("found bookmarks timeline from fiber observer");
							fallbackTimelines.bookmarksTimeline = module;
						}
						if (
							module.perfKey === "likes-GraphQL" &&
							!fallbackTimelines.likesTimeline
						) {
							console.log("found likes timeline from fiber observer");
							fallbackTimelines.likesTimeline = module;
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
						extensionState.groups.tweetComponent = getTweetComponentsFromFiber(
							fiber,
						).match({
							ok: () => EXTENSION_GROUP_OK,
							err: (err) => EXTENSION_GROUP_ERROR(err.toJSON()),
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
	const mapResult = <A>(
		result: Result<A, UnhandledException | WebpackNotFoundError>,
	): GroupState =>
		result.match({
			ok: () => EXTENSION_GROUP_OK,
			err: (err) => EXTENSION_GROUP_ERROR(err.toJSON()),
		});

	extensionState.groups.webpack = mapResult(await initializeWebpack());
	extensionState.groups.messageListener = mapResult(
		initializeMessageListener(),
	);
	extensionState.groups.fiberObserver = mapResult(injectFiberObserver());
	extensionState.groups.urlObserver = mapResult(injectUrlObserver());
	extensionState.groups.tweetObserver = mapResult(injectTweetObserver());
};

if (document.readyState === "complete") inject();
else
	document.addEventListener("readystatechange", () => {
		if (document.readyState === "complete") inject();
	});
