import { Result } from "better-result";
import type { Fiber } from "bippy";
import { getProperty } from "dot-prop";
import { mergician } from "mergician";
import { tweetsEventTarget } from "../features/events/tweets";
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
		user: Record<string, string>;
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

export const setReduxStoreFromFiber = (fiber: Fiber) =>
	Result.try(() => {
		if (!Object.hasOwn(fiber.memoizedProps ?? {}, "store"))
			throw new Error("fiber doesn't have the 'store' prop");
		// @ts-expect-error
		reduxStore = fiber.memoizedProps.store;
	});

export const addEntities = (payload: AddEntitiesPayload) =>
	Result.try(() => {
		if (!reduxStore)
			throw new Error("redux store is undefined, cannot add entities");
		reduxStore.dispatch({
			payload,
			type: "rweb/entities/ADD_ENTITIES",
		});
	});

export const addEntitiesFromDatabaseTweets = async (
	tweets: DatabaseTweet[],
) => {
	let payload: AddEntitiesPayload = {};
	for (const tweet of tweets)
		payload = mergician(
			payload,
			(await getTweetEntityPayloadFromDatabase(tweet.id)).unwrapOr({}),
		);
	return addEntities(payload);
};

export const getTweetEntity = (id: string) =>
	Result.try(() => {
		const tweet = getProperty(
			reduxStore?.getState(),
			`entities.tweets.entities.${id}`,
		) as RawTweet | undefined;
		if (!tweet)
			throw new Error(
				`reduxStore.getState.entities.tweets.entities[${id}] is undefined`,
			);
		return tweet;
	});

export const tweetEntityLoaded = (id: string) => {
	return (
		getProperty(reduxStore?.getState(), `entities.tweets.entities.${id}`) !==
		undefined
	);
};

export const getUserEntity = (id: string) =>
	Result.try(() => {
		const user = getProperty(
			reduxStore?.getState(),
			`entities.users.entities.${id}`,
		) as RawTweetUser | undefined;
		if (!user)
			throw new Error(
				`reduxStore.getState.entities.users.entities[${id}] is undefined`,
			);
		return user;
	});

export const bookmarkTweet = (id: string) =>
	Result.tryPromise(async () => {
		if (!reduxStore)
			throw new Error(`can't bookmark tweet ${id}, redux store is undefined`);

		await Promise.resolve(
			reduxStore.dispatch(webpack.common.redux.api.tweets.bookmark(id)),
		);

		reduxStore.dispatch({
			type: "rweb/urt/INJECT_ENTRY",
			meta: {
				timelineId: "bookmarks",
			},
			payload: {
				// TODO: not tested (bookmarking is currently not needed)
				entry: {
					content: {
						displayType: "Tweet",
						id,
					},
					entryId: `tweet-${id}`,
					type: "tweet",
				},
				atTop: true,
			},
		});
	});

export const unbookmarkTweet = (id: string) =>
	Result.tryPromise(async () => {
		if (!reduxStore)
			throw new Error(`can't unbookmark tweet ${id}, redux store is undefined`);

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
		tweetsEventTarget.dispatchTweetUnbookmarked(id);
	});

// fetches the tweets, updates entities in the database
// if the tweet got unbookmarked, delete it entirely
export const checkDatabaseTweets = (tweets: DatabaseTweet[]) =>
	Result.tryPromise(async () => {
		if ((await getSetting("updateStatistics")) === false) return tweets;
		const ids = (
			await Promise.all(tweets.map((t) => getTweetEntityIds(t.id)))
		).flat();

		if (!reduxStore) throw new Error("redux store is undefined");
		const payload = await Promise.resolve(
			reduxStore.dispatch<{
				entities: AddEntitiesPayload;
				result: string[];
			}>(webpack.common.redux.api.tweets.fetchManyIfNeeded(ids)),
		);
		if (!payload) return tweets;
		await updateEntitiesFromPayload(payload.entities);
		console.log(payload);

		let newTweets = tweets;
		const tweetEntities = payload.entities.tweets ?? {};
		for (const tweet of payload.result) {
			if (!(tweet in tweetEntities)) continue;
			// TODO: this is potentially undesired?
			if (!tweetEntities[tweet].bookmarked) {
				console.log(
					"wiping tweet",
					tweet,
					"since it became unbookmarked (and favedeck didn't notice)",
				);
				newTweets = newTweets.filter((nt) => nt.id !== tweet);
				await removeTweet(tweet, undefined, { markUngrouped: false });
			}
		}
		return newTweets;
	});

export const fetchBookmarksTimelineFromCursor = async (
	cursor: CursorTimelineEntry,
) =>
	Result.tryPromise(async () => {
		if (!reduxStore || !webpack.common.redux.api.bookmarksTimeline)
			return { performed: false };

		return await reduxStore.dispatch<
			| {
					performed: false;
			  }
			| {
					performed: true;
					newEntries: number;
					newTweets: number;
			  }
		>(
			webpack.common.redux.api.bookmarksTimeline.fetchCursor(cursor, {
				count: (await getSetting("fetchMoreTweetsPerRequest")) ? 100 : 20,
			}),
		);
	});

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
