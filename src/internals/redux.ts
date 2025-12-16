import type { Fiber } from "bippy";
import { mergician } from "mergician";
import type { DatabaseTweet } from "../features/storage/definition";
import { getTweetEntityPayload } from "../features/storage/entities";
import type { RawTweet, RawTweetUser } from "../types/tweet";

export type AddEntitiesPayload = {
	tweets?: Record<string, RawTweet>;
	users?: Record<string, RawTweetUser>;
};

let reduxStore:
	| {
			getState: () => object;
			dispatch: (action: object) => void;
	  }
	| undefined;

export const setReduxStoreFromFiber = (fiber: Fiber) => {
	if (!Object.hasOwn(fiber.memoizedProps ?? {}, "store"))
		throw new Error("fiber doesn't have the 'store' prop");
	// @ts-expect-error
	reduxStore = fiber.memoizedProps.store;
};

export const addEntities = (payload: AddEntitiesPayload) => {
	if (!reduxStore) {
		console.error("redux store is undefined, cannot add entities");
		return;
	}
	reduxStore.dispatch({
		payload,
		type: "rweb/entities/ADD_ENTITIES",
	});
};

export const addEntitiesFromDatabaseTweets = async (
	tweets: DatabaseTweet[],
) => {
	let payload: AddEntitiesPayload = {};
	for (const tweet of tweets)
		payload = mergician(payload, await getTweetEntityPayload(tweet.id));
	addEntities(payload);
};

export const getTweetEntity = (id: string): RawTweet => {
	if (!reduxStore) throw new Error("redux store is undefined");
	// @ts-expect-error
	const tweets = reduxStore.getState()?.entities?.tweets?.entities;
	if (!tweets) throw new Error("state.entities.tweets is undefined");
	return tweets[id] as RawTweet;
};

export const getUserEntity = (id: string): RawTweetUser => {
	if (!reduxStore) throw new Error("redux store is undefined");
	// @ts-expect-error
	const users = reduxStore.getState()?.entities?.users?.entities;
	if (!users) throw new Error("state.entities.users is undefined");
	return users[id] as RawTweetUser;
};
