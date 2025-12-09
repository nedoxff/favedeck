import { db } from "./definition";

const PRIMARY_COLOR_KEY = "primary-color";
const BACKGROUND_COLOR_KEY = "bg-color";

export const setBackgroundColor = (color: string) =>
	db.kv.put({ key: BACKGROUND_COLOR_KEY, value: color });
export const getBackgroundColor = () =>
	db.kv.get(BACKGROUND_COLOR_KEY).then((v) => v?.value as string | undefined);

export const setPrimaryColor = (color: string) =>
	db.kv.put({ key: PRIMARY_COLOR_KEY, value: color });
export const getPrimaryColor = () =>
	db.kv.get(PRIMARY_COLOR_KEY).then((v) => v?.value as string | undefined);
