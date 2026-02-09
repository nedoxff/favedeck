import { mergician } from "mergician";
import { compressObject, decompressObject } from "@/src/helpers/compression";
import { getUserId } from "@/src/internals/foolproof";
import {
	type AddEntitiesPayload,
	getTweetEntity,
	tweetEntityLoaded,
} from "@/src/internals/redux";
import { db } from "./definition";
import {
	getTweetEntityPayloadFromDatabase,
	getTweetEntityPayloadFromReduxStore,
} from "./entities";

export type DatabaseDecompressedPotentiallyUngroupedTweet = {
	id: string;
	user: string;
	payload: AddEntitiesPayload;
};

export const addPotentiallyUngroupedTweet = async (
	id: string,
	category: "unbookmarked" | "intentional",
) => {
	console.log(
		"saving",
		id,
		"as a potentially ungrouped tweet (",
		category,
		")",
	);
	await db.potentiallyUngrouped.put({
		id,
		user: (await getUserId()) ?? "",
		payload: await compressObject(
			mergician(
				(await getTweetEntityPayloadFromReduxStore(id)).unwrapOr({}),
				(await getTweetEntityPayloadFromDatabase(id)).unwrapOr({}),
			),
		),
		category,
	});
};

export const removePotentiallyUngroupedTweet = async (id: string) => {
	await db.potentiallyUngrouped.delete([id, (await getUserId()) ?? ""]);
};

export const getPotentiallyUngroupedTweets = async (
	category: "unbookmarked" | "intentional",
): Promise<DatabaseDecompressedPotentiallyUngroupedTweet[]> => {
	const user = (await getUserId()) ?? "";
	return (
		await Promise.all(
			(
				await db.potentiallyUngrouped
					.where("[user+category]")
					.equals([user, category])
					.toArray()
			).map(async (obj) => ({
				...obj,
				payload: (await decompressObject(obj.payload)) as AddEntitiesPayload,
			})),
		)
	).flat();
};

export const checkPotentiallyUngroupedTweets = async (
	tweets: DatabaseDecompressedPotentiallyUngroupedTweet[],
): Promise<DatabaseDecompressedPotentiallyUngroupedTweet[]> => {
	const unbookmarked = tweets.filter((tweet) => {
		if (!tweetEntityLoaded(tweet.id)) return false;
		return getTweetEntity(tweet.id).match({
			ok: (entity) => !entity.bookmarked,
			err: () => false,
		});
	});
	const rest = tweets.filter((t) => !unbookmarked.some((ut) => ut.id === t.id));
	for (const tweet of unbookmarked)
		await removePotentiallyUngroupedTweet(tweet.id);
	return rest;
};
