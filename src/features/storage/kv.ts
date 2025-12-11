import { db } from "./definition";

const MASK_COLOR_KEY = "mask-color";
const PRIMARY_COLOR_KEY = "primary-color";
const BACKGROUND_COLOR_KEY = "bg-color";

const kvGet =
	<T>(key: string) =>
	async () =>
		await db.kv.get(key).then((v) => v?.value as T | undefined);
const kvPut =
	<T>(key: string) =>
	async (value: T) =>
		await db.kv.put({ key, value });

const createColorGettersSetters = (key: string) => ({
	get: kvGet<string>(key),
	set: kvPut<string>(key),
});

export const colors = {
	background: createColorGettersSetters(BACKGROUND_COLOR_KEY),
	primary: createColorGettersSetters(PRIMARY_COLOR_KEY),
	mask: createColorGettersSetters(MASK_COLOR_KEY),
};