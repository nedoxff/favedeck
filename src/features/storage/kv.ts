import { db } from "./definition";
import type { FavedeckSettings } from "./settings";

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
	reloaded: createGettersSetters<string>("reloaded"),
	settings: createGettersSetters<FavedeckSettings>("settings"),
};
