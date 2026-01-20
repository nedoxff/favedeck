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

export type WebpackSearchResult =
	| {
			id: string;
			module: unknown;
	  }
	| undefined;

type WebpackCacheEntry = { id: number; loaded: boolean; exports: unknown };
type WebpackCache = Record<string, WebpackCacheEntry>;

// this is not the full list of available functions, but others are likely not required by the extension
export type ReduxTweetsAPIType = {
	bookmark: (id: string) => ReduxDispatchAction;
	unbookmark: (id: string) => ReduxDispatchAction;
	fetchOne: (id: string) => ReduxDispatchAction;
	fetchOneIfNeeded: (id: string) => ReduxDispatchAction;
	fetchMultiple: (ids: string[]) => ReduxDispatchAction;
	fetchMultipleIfNeeded: (ids: string[]) => ReduxDispatchAction;
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

	load: () => void;
	findByProperty: (
		key: string,
		opts?: FindByPropertyOptions,
	) => WebpackSearchResult;
	findByCode: (code: string) => WebpackSearchResult;

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
				bookmarksTimeline: ReduxBookmarksTimelineAPIType;
			};
		};
	};
};

export const webpack: WebpackHelper = {
	cache: {},
	rawModules: {},

	load() {
		// @ts-expect-error
		const require: ((id: string) => unknown) & {
			m: Record<string, () => unknown>;
			c: WebpackCache;
		} = WEBPACK_SOURCE.push([[Symbol()], {}, (re: unknown) => re]);
		this.rawModules = require.m;
		this.cache = require.c;

		const findOrThrowByProperty = <T>(
			key: string,
			name: string,
			options: FindByPropertyOptions = { maxDepth: 1 },
		) => {
			const result = this.findByProperty(key, options);
			if (!result) throw new Error(`webpack: failed to find ${name}`);
			console.log(`webpack: found ${name}`);
			return result.module as T;
		};

		this.common = {
			react: {
				React: findOrThrowByProperty<ReactType>("useState", "React"),
				ReactDOM: findOrThrowByProperty<ReactDOMType & ReactDOMClientType>(
					"createPortal",
					"ReactDOM",
				),
				JSXRuntime: findOrThrowByProperty<ReactJSXRuntimeType>(
					"jsx",
					"react/jsx-runtime",
				),
			},
			history: findOrThrowByProperty("goBack", "the history (router?) module"),
			redux: {
				api: {
					tweets: findOrThrowByProperty(
						"unbookmark",
						"tweets api actions store (redux)",
					),
					bookmarksTimeline: findOrThrowByProperty(
						"timelineId",
						"bookmarks timeline urt store (redux)",
						{ maxDepth: 1, value: "bookmarks" },
					),
				},
			},
		};

		console.log(this.common);
	},

	findByProperty(key, opts) {
		const matches = (obj: unknown, key: string, depth = 0): unknown | null => {
			try {
				if (typeof obj !== "object" || obj === null) return null;
				if (key in obj) {
					if (
						opts &&
						opts?.value !== undefined &&
						(obj as Record<string, unknown>)[key] !== opts.value
					)
						return null;
					return obj;
				}
				if (depth >= (opts?.maxDepth ?? 0)) return null;

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
		for (const kv of Object.entries(this.cache)) {
			const match = matches(kv[1].exports, key);
			if (match !== null) entry = [...kv, match];
		}
		return entry ? { id: entry[0], module: entry[2] } : undefined;
	},

	findByCode(code) {
		const entry = Object.entries(this.rawModules).find((kv) =>
			Function.prototype.toString.call(kv[1]).includes(code),
		);
		return entry
			? { id: entry[0], module: this.cache[entry[0]].exports }
			: undefined;
	},

	// biome-ignore lint/style/noNonNullAssertion: i don't care!!!
	common: null!,
};
