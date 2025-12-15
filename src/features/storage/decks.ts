import { compressObject } from "@/src/helpers/compression";
import { getUserId } from "@/src/internals/foolproof";
import { getThumbnailUrl } from "@/src/internals/goodies";
import { getTweetEntity, getUserEntity } from "@/src/internals/redux";
import { mergician } from "mergician";
import { type DatabaseDeck, db } from "./definition";

export const UNGROUPED_DECK: DatabaseDeck = {
	id: "ungrouped",
	name: "Ungrouped",
	secret: false,
	user: "",
};

export const getUserDecks = (userId: string) =>
	db.decks.where("user").equals(userId).toArray();
export const getUserDecksAutomatically = async () =>
	await getUserDecks((await getUserId()) ?? "");

export const getDeckSize = (deckId: string) =>
	db.tweets.where("deck").equals(deckId).count();
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
	const tweetEntity = getTweetEntity(tweet);
	const quotedTweetEntity = tweetEntity.quoted_status
		? getTweetEntity(tweetEntity.quoted_status)
		: undefined;
	const userEntity = getUserEntity(tweetEntity.user);

	await db.tweets.put({
		data: await compressObject({
			tweets: mergician(
				{ [tweet]: tweetEntity },
				quotedTweetEntity
					? { [quotedTweetEntity.id_str]: quotedTweetEntity }
					: {},
			),
			users: { [userEntity.id_str]: userEntity },
		}),
		added: new Date(),
		deck,
		id: tweet,
		user: (await getUserId()) ?? "",
		thumbnail:
			getThumbnailUrl(tweetEntity) ?? getThumbnailUrl(quotedTweetEntity),
	});
};
