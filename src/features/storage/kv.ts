import { db } from "./definition";

const kvGet =
	<T>(key: string) =>
	async () =>
		await db.kv.get(key).then((v) => v?.value as T | undefined);
const kvPut =
	<T>(key: string) =>
	async (value: T) =>
		await db.kv.put({ key, value });

const createGettersSetters = <T>(key: string) => ({
	get: kvGet<T>(key),
	set: kvPut<T>(key),
});

export const colors = {
	background: createGettersSetters<string>("bg-color"),
	primary: createGettersSetters<string>("primary-color"),
	mask: createGettersSetters<string>("mask-color"),
};

export const tweets = {
	currentTweet: createGettersSetters<string>("current-tweet")
}