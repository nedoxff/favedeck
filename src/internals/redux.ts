import type { Fiber } from "bippy";
import { getProperty } from "dot-prop";
import { mergician } from "mergician";
import type { DatabaseTweet } from "../features/storage/definition";
import {
	getTweetEntityIds,
	getTweetEntityPayloadFromDatabase,
	updateEntitiesFromPayload,
} from "../features/storage/entities";
import { getSetting } from "../features/storage/settings";
import { removeTweet } from "../features/storage/tweets";
import type { CursorTimelineEntry, TimelineEntry } from "../types/timeline";
import type { RawTweet, RawTweetUser } from "../types/tweet";
import { webpack } from "./webpack";

export type AddEntitiesPayload = {
	tweets?: Record<string, RawTweet>;
	users?: Record<string, RawTweetUser>;
	favedeck?: {
		quoteOf: Record<string, string>;
	};
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
		payload = mergician(
			payload,
			await getTweetEntityPayloadFromDatabase(tweet.id),
		);
	addEntities(payload);
};

export const getTweetEntity = (id: string): RawTweet => {
	const tweet = getProperty(
		reduxStore?.getState(),
		`entities.tweets.entities[${id}]`,
	) as RawTweet | undefined;
	if (!tweet)
		throw new Error(
			`reduxStore.getState.entities.tweets.entities[${id}] is undefined`,
		);
	return tweet;
};

export const tweetEntityLoaded = (id: string) => {
	return (
		getProperty(reduxStore?.getState(), `entities.tweets.entities[${id}]`) !==
		undefined
	);
};

export const getUserEntity = (id: string): RawTweetUser => {
	const user = getProperty(
		reduxStore?.getState(),
		`entities.users.entities[${id}]`,
	) as RawTweetUser | undefined;
	if (!user)
		throw new Error(
			`reduxStore.getState.entities.users.entities[${id}] is undefined`,
		);
	return user;
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

// fetches the tweets, updates entities in the database
// if the tweet got unbookmarked, delete it entirely
export const checkDatabaseTweets = async (tweets: DatabaseTweet[]) => {
	if ((await getSetting("updateStatistics")) === false) return tweets;
	const ids = (
		await Promise.all(tweets.map((t) => getTweetEntityIds(t.id)))
	).flat();

	try {
		if (!reduxStore) throw new Error("redux store is undefined");
		const payloads = await Promise.resolve(
			reduxStore.dispatch<
				{
					entities: AddEntitiesPayload;
					result: string;
				}[]
			>(webpack.common.redux.api.tweets.fetchMultipleIfNeeded(ids)),
		);
		if (!payloads) return tweets;
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
				await removeTweet(payload.result, undefined, { markUngrouped: false });
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

export const fetchBookmarksTimelineFromCursor = async (
	cursor: CursorTimelineEntry,
	count: number = 20,
): Promise<
	| {
			performed: false;
	  }
	| {
			performed: true;
			newEntries: number;
			newTweets: number;
	  }
> => {
	if (!reduxStore || !webpack.common.redux.api.bookmarksTimeline)
		return { performed: false };
	return await reduxStore.dispatch(
		webpack.common.redux.api.bookmarksTimeline.fetchCursor(cursor, { count }),
	);
};

export const getBookmarksTimelineEntries = (): TimelineEntry[] => {
	return (
		(getProperty(reduxStore?.getState(), "urt.bookmarks.entries") as
			| TimelineEntry[]
			| undefined) ?? []
	);
};

// this is a really specific function but it returns
// the last suitable cursor to use for the "sort bookmarks" modal,
// that is the last "top" cursor present in the timeline's entries.
// note: using the "bottom" cursor would meaning skipping the 20 tweets that
// come before the cursor, so we would basically unnecessarily skip tweets. don't use that
export const getBottomBookmarksTimelineCursor = (
	distance = -1,
): CursorTimelineEntry | undefined => {
	return getBookmarksTimelineEntries()
		.filter(
			(e) => e.type === "timelineCursor" && e.content.cursorType === "Bottom",
		)
		.at(distance) as CursorTimelineEntry | undefined;
};
