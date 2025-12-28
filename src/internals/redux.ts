import type { Fiber } from "bippy";
import { mergician } from "mergician";
import { wipeTweet } from "../features/storage/decks";
import type { DatabaseTweet } from "../features/storage/definition";
import {
	getTweetEntityPayload,
	updateEntitiesFromPayload,
} from "../features/storage/entities";
import type { RawTweet, RawTweetUser } from "../types/tweet";
import { webpack } from "./webpack";

export type AddEntitiesPayload = {
	tweets?: Record<string, RawTweet>;
	users?: Record<string, RawTweetUser>;
};

export type ReduxDispatchAction =
	| { type: string; meta?: unknown; payload: unknown }
	| ((
			dispatch: (action: object) => unknown,
			getState: () => object,
			tools: object,
	  ) => object);

let reduxStore:
	| {
			getState: () => object;
			dispatch: <T = void>(action: ReduxDispatchAction) => T | Promise<T>;
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

export const unbookmarkTweet = async (id: string) => {
	if (!reduxStore) {
		console.error(`can't unbookmark tweet ${id}, redux store is undefined`);
		return;
	}

	try {
		await Promise.resolve(
			reduxStore.dispatch(webpack.common.redux.api.tweets.unbookmark(id)),
		);
		reduxStore.dispatch({
			type: "rweb/urt/REMOVE_TWEETS",
			meta: {
				timelineId: "bookmarks",
			},
			payload: {
				[id]: true,
			},
		});
		console.log(`successfully unbookmarked tweet ${id}`);
	} catch (ex) {
		console.error(`failed to unbookmark tweet ${id}`, ex);
	}
};

// TODO: hide this behind a setting
// fetches the tweets, updates entities in the database
// if the tweet got unbookmarked, delete it entirely
export const checkDatabaseTweets = async (tweets: DatabaseTweet[]) => {
	try {
		if (!reduxStore) throw new Error("redux store is undefined");
		const payloads = await Promise.resolve(
			reduxStore.dispatch<
				{
					entities: AddEntitiesPayload;
					result: string;
				}[]
			>(
				webpack.common.redux.api.tweets.fetchMultipleIfNeeded(
					tweets.map((t) => t.id),
				),
			),
		);
		if(!payloads) return tweets;
		console.log(payloads);

		let newTweets = tweets;
		for (const payload of payloads) {
			const payloadTweets = payload.entities.tweets ?? {};
			if (!(payload.result in payloadTweets)) continue;
			// TODO: this is potentially undesired?
			if (!payloadTweets[payload.result].bookmarked) {
				console.log(
					"wiping tweet",
					payload.result,
					"since it became unbookmarked (and favedeck didn't notice)",
				);
				newTweets = newTweets.filter((nt) => nt.id !== payload.result);
				await wipeTweet(payload.result);
			} else {
				console.log("updating entities for tweet", payload.result);
				await updateEntitiesFromPayload(payload.entities);
			}
		}
		return newTweets;
	} catch (ex) {
		console.error("failed to check database tweets", ex);
		return tweets;
	}
};
