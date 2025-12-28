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

type WebpackCache = Record<
	string,
	{ id: number; loaded: boolean; exports: unknown }
>;

// this is not the full list of available functions, but others are likely not required by the extension
export type ReduxTweetsAPIType = {
	bookmark: (id: string) => ReduxDispatchAction;
	unbookmark: (id: string) => ReduxDispatchAction;
	fetchOne: (id: string) => ReduxDispatchAction;
	fetchOneIfNeeded: (id: string) => ReduxDispatchAction;
	fetchMultiple: (ids: string[]) => ReduxDispatchAction;
	fetchMultipleIfNeeded: (ids: string[]) => ReduxDispatchAction;
};

export type WebpackHelper = {
	rawModules: Record<string, () => unknown>;
	cache: WebpackCache;

	load: () => void;
	findByProperty: (
		key: string,
		opts?: {
			maxDepth: number;
		},
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
			maxDepth = 0,
		) => {
			const result = this.findByProperty(key, { maxDepth });
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
			history: findOrThrowByProperty<{ ZP: HistoryType }>(
				"goBack",
				"the history (router?) module",
				1,
			).ZP,
			redux: {
				api: {
					tweets: findOrThrowByProperty<{ Z: ReduxTweetsAPIType }>(
						"unbookmark",
						"tweets api actions store (redux)",
						1,
					).Z,
				},
			},
		};

		console.log(this.common);
	},

	findByProperty(key, opts) {
		const matches = (obj: unknown, key: string, depth = 0) => {
			if (typeof obj !== "object" || obj === null) return false;
			if (key in obj) return true;
			if (depth >= (opts?.maxDepth ?? 0)) return false;

			if (Object.values(obj).some((o) => matches(o, key, depth + 1)))
				return true;
			return false;
		};
		const entry = Object.entries(this.cache).find((kv) =>
			matches(kv[1].exports, key),
		);
		return entry ? { id: entry[0], module: entry[1].exports } : undefined;
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
