// @ts-expect-error
const WEBPACK_SOURCE: unknown[] = window.webpackChunk_twitter_responsive_web;

export type WebpackHelper = {
	cache: Record<string, unknown>;

	load: () => void;
	findByProperty: (key: string) => {
		id: string;
		module: unknown;
	} | undefined;
};

export const webpack: WebpackHelper = {
	cache: {},

	load() {
		// @ts-expect-error
		const require: ((id: string) => unknown) & {
			m: Record<string, unknown>;
		} = WEBPACK_SOURCE.push([[Symbol()], {}, (re: unknown) => re]);
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
};
