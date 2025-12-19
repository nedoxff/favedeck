import { type DatabaseDeck, db } from "./definition";

const kvGet =
	<T>(key: string) =>
	async () =>
		await db.kv.get(key).then((v) => v?.value as T | undefined);
const kvPut =
	<T>(key: string) =>
	async (value: T | undefined) =>
		value === undefined
			? await db.kv.delete(key)
			: await db.kv.put({ key, value });

const createGettersSetters = <T>(key: string) => ({
	get: kvGet<T>(key),
	set: kvPut<T>(key),
});

export const kv = {
	tweets: {
		currentTweet: createGettersSetters<string>("current-tweet"),
		tweetComponentsAvailable: createGettersSetters<string>(
			"tweet-components-available",
		),
	},
	decks: {
		newDeck: createGettersSetters<string>("new-deck"),
		currentDeck: createGettersSetters<DatabaseDeck>("current-deck"),
	},
};
