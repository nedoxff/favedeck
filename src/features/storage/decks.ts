import { getUserId } from "@/src/internals/foolproof";
import { db } from "./definition";

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
	return await collection.toArray();
};
