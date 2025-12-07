// @ts-expect-error
const WEBPACK_SOURCE: unknown[] = window.webpackChunk_twitter_responsive_web;

export type WebpackSearchResult =
	| {
			id: string;
			module: unknown;
	  }
	| undefined;

export type WebpackHelper = {
	rawModules: Record<string, () => unknown>;
	cache: Record<string, unknown>;

	load: () => void;
	findByProperty: (key: string) => WebpackSearchResult;
	findByCode: (code: string) => WebpackSearchResult;
};

export const webpack: WebpackHelper = {
	cache: {},
	rawModules: {},

	load() {
		// @ts-expect-error
		const require: ((id: string) => unknown) & {
			m: Record<string, () => unknown>;
		} = WEBPACK_SOURCE.push([[Symbol()], {}, (re: unknown) => re]);
		this.rawModules = require.m;
		this.cache = Object.fromEntries(
			Object.entries(require.m)
				.map((kv) => {
					try {
						return [kv[0], require(kv[0])];
					} catch (ex) {
						console.warn(`failed to load module ${kv[0]}: ${ex}`);
						return undefined;
					}
				})
				.filter((kv) => kv && kv[1] !== undefined) as [string, unknown][],
		);
	},

	findByProperty(key) {
		const entry = Object.entries(this.cache).find(
			(kv) => typeof kv[1] === "object" && kv[1] !== null && key in kv[1],
		);
		return entry ? { id: entry[0], module: entry[1] } : undefined;
	},

	findByCode(code) {
		const entry = Object.entries(this.rawModules).find((kv) =>
			Function.prototype.toString.call(kv[1]).includes(code),
		);
		return entry ? { id: entry[0], module: this.cache[entry[0]] } : undefined;
	},
};
