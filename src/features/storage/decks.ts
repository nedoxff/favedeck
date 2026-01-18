import Dexie from "dexie";
import { v6 } from "uuid";
import { getUserId } from "@/src/internals/foolproof";
import { getThumbnailUrl } from "@/src/internals/goodies";
import {
	getTweetEntity,
	getUserEntity,
	tweetEntityLoaded,
} from "@/src/internals/redux";
import type { RawTweet } from "@/src/types/tweet";
import { decksEventTarget } from "../events/decks";
import { tweetsEventTarget } from "../events/tweets";
import { type DatabaseDeck, db } from "./definition";
import { putTweetEntity, removeTweetEntityAndRelatives } from "./entities";

export const ALL_BOOKMARKS_DECK: DatabaseDeck = {
	id: "all",
	name: "All bookmarks",
	secret: false,
	user: "",
	dateModified: new Date(),
	viewMode: "regular",
	order: Dexie.minKey,
};

export const getDeck = async (id: string) => {
	if (id === "all") return ALL_BOOKMARKS_DECK;
	return await db.decks.get(id);
};

export const createDeck = async (name: string, secret: boolean) => {
	const deck: DatabaseDeck = {
		id: v6(),
		name,
		secret,
		user: (await getUserId()) ?? "",
		dateModified: new Date(),
		viewMode: "regular",
		order: Dexie.minKey,
	};
	await db.decks.put(deck);
	decksEventTarget.dispatchDeckCreated(deck);
	return deck.id;
};

export const deleteDeck = async (deckId: string) => {
	const tweets = await getAllDeckTweets(deckId).toArray();
	await db.decks.delete(deckId);
	await Promise.all(tweets.map((tweet) => wipeTweet(tweet.id, deckId)));
};

export const getUserDecks = (userId: string) =>
	db.decks.where("user").equals(userId).sortBy("order");
export const getUserDecksAutomatically = async () =>
	await getUserDecks((await getUserId()) ?? "");

export const getDeckSize = (deckId: string) =>
	db.tweets.where({ deck: deckId }).count();
export const getAllDeckTweets = (deckId: string) =>
	db.tweets.where({ deck: deckId });
export const getDeckTweets = async (deckId: string, skip = 0, count = -1) => {
	let collection = db.tweets
		.where("[deck+order+dateAdded]")
		.between(
			[deckId, Dexie.minKey, Dexie.minKey],
			[deckId, Dexie.maxKey, Dexie.maxKey],
		)
		.reverse();
	if (skip !== 0) collection = collection.offset(skip);
	if (count !== -1) collection = collection.limit(count);
	return await collection.toArray();
};
export const isTweetInDeck = async (id: string) =>
	(await db.tweets.where({ id, user: await getUserId() }).count()) !== 0;
export const isTweetInSpecificDeck = async (id: string, deck: string) =>
	(await db.tweets.get([id, await getUserId(), deck])) !== undefined;

export const getDeckThumbnails = async (id: string, limit = 1) =>
	(
		await db.tweets
			.where("[deck+order+dateAdded]")
			.between(
				[id, Dexie.minKey, Dexie.minKey],
				[id, Dexie.maxKey, Dexie.maxKey],
			)
			.reverse()
			.filter((t) => t.thumbnail !== undefined)
			.limit(limit)
			.toArray()
	)
		// biome-ignore lint/style/noNonNullAssertion: filtered
		.map((t) => t.thumbnail!);

export const addTweetToDeck = async (deck: string, tweet: string) => {
	const putTweetEntityRecursive = async (
		entity: RawTweet,
		quoteOf?: string,
	) => {
		await putTweetEntity(entity, getUserEntity(entity.user), quoteOf);
		if (entity.quoted_status && tweetEntityLoaded(entity.quoted_status)) {
			const quotedEntity = getTweetEntity(entity.quoted_status);
			await putTweetEntityRecursive(quotedEntity, entity.id_str);
		}
	};

	const getThumbnailUrlRecursive = async (entity: RawTweet) => {
		const thumbnailUrl = getThumbnailUrl(entity);
		if (thumbnailUrl) return thumbnailUrl;
		const quotedEntity = entity.quoted_status
			? getTweetEntity(entity.quoted_status)
			: undefined;
		return getThumbnailUrl(quotedEntity);
	};

	const tweetEntity = getTweetEntity(tweet);
	await putTweetEntityRecursive(tweetEntity);
	await db.tweets.put({
		dateAdded: new Date(),
		deck,
		id: tweet,
		user: (await getUserId()) ?? "",
		thumbnail: await getThumbnailUrlRecursive(tweetEntity),
		order: Dexie.minKey,
	});
	tweetsEventTarget.dispatchTweetDecked(tweet, deck);
};

export const wipeTweet = async (id: string, deck?: string) => {
	const user = await getUserId();
	// deck here is optional so don't use .get
	await db.tweets
		.where(["id", "user", "deck"])
		.between([id, user, deck ?? Dexie.minKey], [id, user, deck ?? Dexie.maxKey])
		.delete();
	const similarTweetsLeft = await db.tweets.where({ id, user }).count();
	if (similarTweetsLeft === 0) await removeTweetEntityAndRelatives(id);
};

export const updateTweetsOrder = async (deck: string, tweets: string[]) => {
	const user = await getUserId();
	if (!user) return;
	await db.transaction("rw", db.tweets, async () => {
		const deckSize = await getDeckSize(deck);
		await db.tweets.bulkUpdate(
			tweets.map((id, index) => ({
				key: [id, user, deck],
				changes: {
					order: deckSize - index,
				},
			})),
		);
	});
};

export const updateDecksOrder = async (ids: string[]) => {
	await db.transaction("rw", db.decks, async () => {
		await db.decks.bulkUpdate(
			ids.map((id, index) => ({
				key: id,
				changes: {
					order: index,
				},
			})),
		);
	});
};
