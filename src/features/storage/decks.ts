import { v6 } from "uuid";
import { getUserId } from "@/src/internals/foolproof";
import { getThumbnailUrl } from "@/src/internals/goodies";
import { getTweetEntity, getUserEntity } from "@/src/internals/redux";
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
	};
	await db.decks.put(deck);
	decksEventTarget.dispatchDeckCreated(deck);
	return deck.id;
};

export const deleteDeck = async (deckId: string) => {
	const tweets = await (await getAllDeckTweets(deckId)).toArray();
	await db.decks.delete(deckId);
	await Promise.all(tweets.map((t) => wipeTweet(t.id)));
};

export const getUserDecks = (userId: string) =>
	db.decks.where("user").equals(userId).toArray();
export const getUserDecksAutomatically = async () =>
	await getUserDecks((await getUserId()) ?? "");

export const getDeckSize = (deckId: string) =>
	db.tweets.where("deck").equals(deckId).count();
export const getAllDeckTweets = async (deckId: string) =>
	db.tweets.where("deck").equals(deckId);
export const getDeckTweets = async (deckId: string, skip = 0, count = -1) => {
	let collection = db.tweets.where("deck").equals(deckId);
	if (skip !== 0) collection = collection.offset(skip);
	if (count !== -1) collection = collection.limit(count);
	return await collection.reverse().sortBy("added");
};
export const isTweetInDeck = async (id: string) =>
	(await db.tweets.where("id").equals(id).count()) !== 0;
export const isTweetInSpecificDeck = async (id: string, deck: string) =>
	(await db.tweets.where({ id, deck }).count()) !== 0;

export const getDeckThumbnails = async (id: string, limit = 1) =>
	(
		await db.tweets
			.where("deck")
			.equals(id)
			.filter((t) => t.thumbnail !== undefined)
			.limit(limit)
			.reverse()
			.sortBy("added")
	)
		// biome-ignore lint/style/noNonNullAssertion: filtered
		.map((t) => t.thumbnail!);

export const addTweetToDeck = async (deck: string, tweet: string) => {
	const putTweetEntityRecursive = async (
		entity: RawTweet,
		quoteOf?: string,
	) => {
		await putTweetEntity(entity, getUserEntity(entity.user), quoteOf);
		if (entity.quoted_status) {
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
		author: tweetEntity.user,
		thumbnail: await getThumbnailUrlRecursive(tweetEntity),
	});
	tweetsEventTarget.dispatchTweetDecked(tweet, deck);
};

export const wipeTweet = async (id: string) => {
	await db.tweets.where({ id, user: await getUserId() }).delete();
	await removeTweetEntityAndRelatives(id);
};
