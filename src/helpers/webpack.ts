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
};
