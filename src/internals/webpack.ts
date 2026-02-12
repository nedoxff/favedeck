import { Result, type UnhandledException } from "better-result";
import { type Memoized, memoize } from "micro-memoize";
import { WebpackNotFoundError } from "../helpers/errors";
import type { TwitterThemeModule } from "../types/theme";
import type { CursorTimelineEntry } from "../types/timeline";
import type { ReduxDispatchAction } from "./redux";

type ReactType = typeof import("react");
type ReactDOMType = typeof import("react-dom");
type ReactDOMClientType = typeof import("react-dom/client");
type ReactJSXRuntimeType = typeof import("react/jsx-runtime");

// i have no idea if this is some custom history
// thing by twitter based on its name (RichHistory)
export type HistoryLocation = {
	hash?: string;
	key?: string;
	pathname: string;
	query?: Record<string, string>;
	search?: string;
	state?: unknown;
};
export type HistoryType = {
	_history: {
		location: HistoryLocation;
	};
	_locationsHistory: {
		locationKey: string;
		locationPathname: string;
		isModalRoute: boolean;
	}[];

	go: (path: string) => void;
	goBack: (path?: string) => void;
	push: (path: string | HistoryLocation) => void;
	replace: (path: string) => void;
	listen: (
		listener: (location: HistoryLocation, action: string) => void,
	) => () => void;
};

// @ts-expect-error
const WEBPACK_SOURCE: unknown[] = window.webpackChunk_twitter_responsive_web;

export type WebpackSearchResult<T> = {
	id: string;
	module: T;
};

type WebpackCacheEntry = { id: number; loaded: boolean; exports: unknown };
type WebpackCache = Record<string, WebpackCacheEntry>;

// this is not the full list of available functions, but others are likely not required by the extension
export type ReduxTweetsAPIType = {
	bookmark: (id: string) => ReduxDispatchAction;
	unbookmark: (id: string) => ReduxDispatchAction;
	fetchOne: (id: string) => ReduxDispatchAction;
	fetchOneIfNeeded: (id: string) => ReduxDispatchAction;
	fetchMany: (ids: string[]) => ReduxDispatchAction;
	fetchManyIfNeeded: (ids: string[]) => ReduxDispatchAction;
};

export type ReduxBookmarksTimelineAPIType = {
	fetchCursor: (
		cursor: CursorTimelineEntry,
		options: {
			count: number;
		},
	) => ReduxDispatchAction;
	fetchBottom: () => ReduxDispatchAction;
	fetchTop: () => ReduxDispatchAction;
	fetchInitialOrTop: () => ReduxDispatchAction;
};

export type FindByPropertyOptions = {
	maxDepth: number;
	value?: unknown;
};

export type WebpackHelper = {
	rawModules: Record<string, () => unknown>;
	cache: WebpackCache;

	load: () => Result<void, WebpackNotFoundError | UnhandledException>;
	findByProperty: Memoized<
		<T>(
			key: string,
			moduleName: string,
			opts?: FindByPropertyOptions,
		) => Result<WebpackSearchResult<T>, WebpackNotFoundError>,
		{ isKeyItemEqual: "deep"; forceUpdate: (args: unknown[]) => boolean }
	>;
	findByCode: <T>(
		code: string,
		moduleName: string,
	) => Result<WebpackSearchResult<T>, WebpackNotFoundError>;

	common: {
		react: {
			React: ReactType;
			ReactDOM: ReactDOMType & ReactDOMClientType;
			JSXRuntime: ReactJSXRuntimeType;
		};
		history: HistoryType;
		redux: {
			api: {
				tweets: ReduxTweetsAPIType;
				bookmarksTimeline?: ReduxBookmarksTimelineAPIType;
			};
		};
		theme: TwitterThemeModule;
	};
};

export const webpack: WebpackHelper = {
	cache: {},
	rawModules: {},

	load: () =>
		Result.gen(function* () {
			yield* Result.try(() => {
				// @ts-expect-error
				const require: ((id: string) => unknown) & {
					m: Record<string, () => unknown>;
					c: WebpackCache;
				} = WEBPACK_SOURCE.push([[Symbol()], {}, (re: unknown) => re]);
				webpack.rawModules = require.m;
				webpack.cache = require.c;
			});

			webpack.common = {
				react: {
					React: (yield* webpack.findByProperty<ReactType>("useMemo", "React"))
						.module,
					ReactDOM: (yield* webpack.findByProperty<
						ReactDOMType & ReactDOMClientType
					>("createPortal", "ReactDOM")).module,
					JSXRuntime: (yield* webpack.findByProperty<ReactJSXRuntimeType>(
						"jsx",
						"react/jsx-runtime",
					)).module,
				},
				history: (yield* webpack.findByProperty<HistoryType>(
					"goBack",
					"the history (router?) module",
					{ maxDepth: 1 },
				)).module,
				redux: {
					api: {
						tweets: (yield* webpack.findByProperty<ReduxTweetsAPIType>(
							"unbookmark",
							"tweets api actions store (redux)",
							{ maxDepth: 1 },
						)).module,
						get bookmarksTimeline() {
							return webpack
								.findByProperty<ReduxBookmarksTimelineAPIType>(
									"timelineId",
									"bookmarks timeline urt store (redux)",
									{ maxDepth: 1, value: "bookmarks" },
								)
								.map((r) => r.module)
								.unwrapOr(undefined);
						},
					},
				},
				theme: (yield* webpack.findByProperty<TwitterThemeModule>(
					"_activeTheme",
					"Theme module",
					{
						maxDepth: 1,
					},
				)).module,
			};

			console.log(webpack.common);
			return Result.ok();
		}),

	findByProperty: memoize(
		<T>(key: string, moduleName: string, options?: FindByPropertyOptions) => {
			const start = performance.now();
			const matches = (
				obj: unknown,
				key: string,
				depth = 0,
			): unknown | null => {
				try {
					if (typeof obj !== "object" || obj === null) return null;
					if (key in obj) {
						if (
							options &&
							options?.value !== undefined &&
							(obj as Record<string, unknown>)[key] !== options.value
						)
							return null;
						return obj;
					}
					if (depth >= (options?.maxDepth ?? 0)) return null;

					for (const value of Object.values(obj)) {
						const result = matches(value, key, depth + 1);
						if (result !== null) return result;
					}
					return null;
				} catch (_) {
					return null;
				}
			};

			let entry: [string, WebpackCacheEntry, unknown] | undefined;
			for (const kv of Object.entries(webpack.cache)) {
				const match = matches(kv[1].exports, key);
				if (match !== null) entry = [...kv, match];
			}

			if (entry)
				console.log(
					"webpack: found",
					moduleName,
					"in",
					Math.round(performance.now() - start),
					"ms (",
					entry[0],
					")",
				);
			else console.warn("webpack: failed to find", moduleName);

			return entry
				? Result.ok({ id: entry[0], module: entry[2] as T })
				: Result.err(
						new WebpackNotFoundError({ key, name: moduleName, options }),
					);
		},
		{
			forceUpdate: (args): boolean =>
				webpack.findByProperty.cache.g(args)?.v.isErr() ?? true,
			isKeyItemEqual: "deep",
		},
	),

	findByCode<T>(code: string, moduleName: string) {
		const entry = Object.entries(this.rawModules).find((kv) =>
			Function.prototype.toString.call(kv[1]).includes(code),
		);

		return entry
			? Result.ok({ id: entry[0], module: this.cache[entry[0]].exports as T })
			: Result.err(new WebpackNotFoundError({ key: code, name: moduleName }));
	},

	// biome-ignore lint/style/noNonNullAssertion: i don't care!!!
	common: null!,
};
