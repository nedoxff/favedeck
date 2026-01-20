import Dexie from "dexie";
import { getUserId } from "@/src/internals/foolproof";
import { getThumbnailUrl } from "@/src/internals/goodies";
import {
	type AddEntitiesPayload,
	getBookmarksTimelineEntries,
	getTweetEntity,
} from "@/src/internals/redux";
import type { TweetTimelineEntry } from "@/src/types/timeline";
import type { RawTweet } from "@/src/types/tweet";
import { tweetsEventTarget } from "../events/tweets";
import { db } from "./definition";
import {
	getTweetEntityPayloadFromReduxStore,
	putTweetEntity,
	removeTweetEntityAndRelatives,
} from "./entities";
import {
	addPotentiallyUngroupedTweet,
	removePotentiallyUngroupedTweet,
} from "./potentially-ungrouped";

export const isTweetInDeck = async (id: string) =>
	(await db.tweets
		.where("[id+user+deck]")
		.between(
			[id, (await getUserId()) ?? "", Dexie.minKey],
			[id, (await getUserId()) ?? "", Dexie.maxKey],
			true,
			true,
		)
		.count()) !== 0;
export const isTweetInSpecificDeck = async (id: string, deck: string) =>
	(await db.tweets.get([id, await getUserId(), deck])) !== undefined;

export const addTweetToDeck = async (deck: string, tweet: string) => {
	const entities = (await getTweetEntityPayloadFromReduxStore(
		tweet,
	)) as Required<AddEntitiesPayload>;
	for (const entity of Object.values(entities.tweets))
		if (entity.user in entities.users)
			await putTweetEntity(
				entity,
				entities.users[entity.user],
				entities.favedeck.quoteOf[entity.id_str],
			);

	const getThumbnailUrlRecursive = async (entity: RawTweet) => {
		const thumbnailUrl = getThumbnailUrl(entity);
		if (thumbnailUrl) return thumbnailUrl;
		const quotedEntity = entity.quoted_status
			? getTweetEntity(entity.quoted_status)
			: undefined;
		return getThumbnailUrl(quotedEntity);
	};

	await db.tweets.put({
		dateAdded: new Date(),
		deck,
		id: tweet,
		user: (await getUserId()) ?? "",
		thumbnail: await getThumbnailUrlRecursive(entities.tweets[tweet]),
		order: Dexie.minKey,
	});
	await removePotentiallyUngroupedTweet(tweet);
	tweetsEventTarget.dispatchTweetDecked(tweet, deck);
};

export const removeTweet = async (
	id: string,
	deck?: string,
	options: { markUngrouped: boolean } = { markUngrouped: true },
) => {
	const user = await getUserId();
	// deck here is optional so don't use .get
	await db.tweets
		.where("[id+user+deck]")
		.between(
			[id, user, deck ?? Dexie.minKey],
			[id, user, deck ?? Dexie.maxKey],
			true,
			true,
		)
		.delete();
	if (options.markUngrouped && !(await isTweetInDeck(id)))
		await addPotentiallyUngroupedTweet(id);
	const similarTweetsLeft = await db.tweets.where({ id, user }).count();
	if (similarTweetsLeft === 0) await removeTweetEntityAndRelatives(id);
	if (deck) tweetsEventTarget.dispatchTweetUndecked(id, deck);
};

export const splitTweets = async (
	entries: TweetTimelineEntry[],
): Promise<[TweetTimelineEntry[], TweetTimelineEntry[]]> => {
	const user = await getUserId();
	return await db.transaction("r", db.tweets, async () => {
		const unsorted = (
			await Promise.all(
				entries.map(async (entry) => ({
					value: entry,
					include:
						(await db.tweets.where({ id: entry.content.id, user }).count()) <=
						0,
				})),
			)
		)
			.filter((obj) => obj.include)
			.map((obj) => obj.value);
		const sorted = entries.filter(
			(e) => !unsorted.some((e1) => e.entryId === e1.entryId),
		);
		return [unsorted, sorted];
	});
};

export const getLatestSortedTweet = async (): Promise<
	TweetTimelineEntry | undefined
> => {
	const tweets = getBookmarksTimelineEntries().filter(
		(entry) => entry.type === "tweet",
	);
	return await db.transaction("r", db.tweets, async () => {
		return (
			await Promise.all(
				tweets.map(async (entry) => ({
					value: entry,
					include: await isTweetInDeck(entry.content.id),
				})),
			)
		)
			.filter((obj) => obj.include)
			.map((obj) => obj.value)
			.at(0);
	});
};
