import { getProperty, setProperty } from "dot-prop";
import type { Get, Paths } from "type-fest";
import { kv } from "./kv";

export type FavedeckSettings = {
	updateStatistics: boolean;
	fetchMoreTweetsPerRequest: boolean;
	preferredSortBookmarksInterface: "ask" | "card-game" | "masonry";
};

export const DEFAULT_SETTINGS: FavedeckSettings = {
	updateStatistics: false,
	fetchMoreTweetsPerRequest: false,
	preferredSortBookmarksInterface: "ask",
};

export const getSetting = async (path: Paths<FavedeckSettings>) =>
	getProperty((await kv.settings.get()) ?? DEFAULT_SETTINGS, path);

export const setSetting = async <T extends Paths<FavedeckSettings>>(
	path: T,
	value: Get<FavedeckSettings, T>,
) => {
	const settings = structuredClone(
		(await kv.settings.get()) ?? DEFAULT_SETTINGS,
	);
	setProperty(settings, path, value);
	await kv.settings.set(settings);
};
