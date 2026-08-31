import { Result } from "better-result";
import Dexie from "dexie";
import { getUserId } from "@/src/internals/foolproof";
import { getThumbnailUrl } from "@/src/internals/goodies";
import { getTimelineEntries, getTweetEntity } from "@/src/internals/redux";
import type { TweetTimelineEntry } from "@/src/types/timeline";
import type { RawTweet } from "@/src/types/tweet";
import { tweetsEventTarget } from "../events/tweets";
import { getDeck } from "./decks";
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

export const getTweetDecks = async (id: string) => {
	const userId = (await getUserId()) ?? "";
	return (
		await db.decks.bulkGet(
			Array.from(
				new Set(
					(
						await db.tweets
							.where("[id+user+deck]")
							.between(
								[id, userId, Dexie.minKey],
								[id, userId, Dexie.maxKey],
								true,
								true,
							)
							.keys()
					).map((t) => (t as unknown as [string, string, string])[2]),
				),
			),
		)
	).filter((d) => d !== undefined);
};
export const isTweetInDeck = async (
	id: string,
	deckCategory: "bookmarks" | "likes" | undefined,
) =>
	(await getTweetDecks(id)).some(
		(d) =>
			d.category === (deckCategory === undefined ? d.category : deckCategory),
	);
export const isTweetInSpecificDeck = async (id: string, deck: string) =>
	(await db.tweets.get([id, await getUserId(), deck])) !== undefined;

export const addTweetToDeck = (tweet: string, deck: string) =>
	Result.tryPromise(async () => {
		const entities = await getTweetEntityPayloadFromReduxStore(tweet);
		if (entities.isErr()) throw entities.error;

		for (const entity of Object.values(entities.value.tweets))
			if (entity.user in entities.value.users)
				await putTweetEntity(
					entity,
					entities.value.users[entity.user],
					entities.value.favedeck.quoteOf[entity.id_str],
				);

		const getThumbnailUrlRecursive = async (entity: RawTweet) => {
			const thumbnailUrl = getThumbnailUrl(entity);
			if (thumbnailUrl) return thumbnailUrl;
			const quotedEntity = entity.quoted_status
				? getTweetEntity(entity.quoted_status).unwrapOr(undefined)
				: undefined;
			return getThumbnailUrl(quotedEntity);
		};

		await db.tweets.put({
			dateAdded: Date.now(),
			deck,
			id: tweet,
			user: (await getUserId()) ?? "",
			thumbnail: await getThumbnailUrlRecursive(entities.value.tweets[tweet]),
			order: Dexie.minKey,
		});

		const category = (await getDeck(deck))?.category ?? "bookmarks";
		await removePotentiallyUngroupedTweet(
			tweet,
			category === "bookmarks" ? ["unbookmarked"] : ["unliked"],
		);
		tweetsEventTarget.dispatchTweetDecked(tweet, deck);
	});

export const removeTweet = (
	id: string,
	deck?: string,
	options: { markUngrouped: boolean } = { markUngrouped: true },
) =>
	Result.tryPromise(async () => {
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
		if (options.markUngrouped && deck) {
			const category = (await getDeck(deck))?.category ?? "bookmarks";
			if (!(await isTweetInDeck(id, category)))
				await addPotentiallyUngroupedTweet(
					id,
					category === "bookmarks" ? "unbookmarked" : "unliked",
				);
		}
		const similarTweetsLeft = await db.tweets.where({ id, user }).count();
		if (similarTweetsLeft === 0) await removeTweetEntityAndRelatives(id);
		if (deck) tweetsEventTarget.dispatchTweetUndecked(id, deck);
	});

export const splitTweets = async (
	entries: TweetTimelineEntry[],
	category: "bookmarks" | "likes",
): Promise<[TweetTimelineEntry[], TweetTimelineEntry[]]> => {
	const user = (await getUserId()) ?? "";
	return await db.transaction(
		"r",
		db.tweets,
		db.potentiallyUngrouped,
		async () => {
			const unsorted = (
				await Promise.all(
					entries.map(async (entry) => ({
						value: entry,
						include:
							(await db.tweets.where({ id: entry.content.id, user }).count()) <=
								0 &&
							(await db.potentiallyUngrouped
								.where("[id+user+category]")
								.anyOf(
									category === "bookmarks"
										? [
												[entry.content.id, user, "unbookmarked"],
												[entry.content.id, user, "intentional-bookmarks"],
											]
										: [
												[entry.content.id, user, "unliked"],
												[entry.content.id, user, "intentional-likes"],
											],
								)
								.count()) <= 0,
					})),
				)
			)
				.filter((obj) => obj.include)
				.map((obj) => obj.value);
			const sorted = entries.filter(
				(e) => !unsorted.some((e1) => e.entryId === e1.entryId),
			);
			return [unsorted, sorted];
		},
	);
};

export const getLatestSortedTweet = async (
	category: "bookmarks" | "likes",
): Promise<TweetTimelineEntry | undefined> => {
	const tweets = getTimelineEntries(
		category === "bookmarks"
			? "bookmarks"
			: `favorites-${(await getUserId()) ?? ""}`,
	).filter((entry) => entry.type === "tweet");
	return await db.transaction("r", [db.tweets, db.decks], async () => {
		return (
			await Promise.all(
				tweets.map(async (entry) => ({
					value: entry,
					include: await isTweetInDeck(entry.content.id, category),
				})),
			)
		)
			.filter((obj) => obj.include)
			.map((obj) => obj.value)
			.at(0);
	});
};
