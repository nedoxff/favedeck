import { getUserId } from "@/src/helpers/foolproof";
import { db } from "./definition";

export const getUserDecks = (userId: string) =>
	db.decks.where("user").equals(userId).toArray();
export const getUserDecksAutomatically = async () =>
	await getUserDecks((await getUserId()) ?? "");

export const getDeckSize = (deckId: string) =>
	db.tweets.where("deck").equals(deckId).count();
