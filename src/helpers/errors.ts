import { TaggedError } from "better-result";
import type { FindByPropertyOptions } from "../internals/webpack";

export class WebpackNotFoundError extends TaggedError("WebpackNotFoundError")<{
	key: string;
	name: string;
	options?: FindByPropertyOptions;
}>() {}

export const ignoreErrors = (callback: () => void | Promise<void>) => {
	try {
		const result = callback();
		if (result instanceof Promise) return result.catch((_ex) => {});
		return result;
	} catch (ex) {
		console.warn(ex);
	}
};
