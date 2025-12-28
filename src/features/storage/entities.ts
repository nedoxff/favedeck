import { compressObject, decompressObject } from "@/src/helpers/compression";
import type { AddEntitiesPayload } from "@/src/internals/redux";
import type { RawTweet, RawTweetUser } from "@/src/types/tweet";
import { mergician } from "mergician";
import { db } from "./definition";

export type TweetEntityMeta = {
	user: string;
	quoteOf?: string;
};

export const putTweetEntity = async (
	entity: RawTweet,
	userEntity: RawTweetUser,
	quoteOf?: string,
) => {
	await db.entities.put({
		key: `user-${userEntity.id_str}`,
		type: "user",
		data: await compressObject(userEntity),
	});
	await db.entities.put({
		key: `tweet-${entity.id_str}`,
		type: "tweet",
		data: await compressObject(entity),
		meta: {
			user: entity.user,
			quoteOf,
		} satisfies TweetEntityMeta,
	});
};

export const removeTweetEntityAndRelatives = async (id: string) => {
	const tweetEntity = await db.entities.get(`tweet-${id}`);
	if (!tweetEntity || !tweetEntity.meta) return;

	const meta = tweetEntity.meta as TweetEntityMeta;
	if (meta.quoteOf) {
		const canSafelyRemoveQuoteTweet =
			(await db.entities.where({ meta: { quoteOf: meta.quoteOf } }).count()) <=
			1;
		console.log("can safely remove quote tweet", canSafelyRemoveQuoteTweet);
		if (!canSafelyRemoveQuoteTweet) return;

		const quotedTweetEntity = await db.entities.get(`tweet-${meta.quoteOf}`);
		if (!quotedTweetEntity || !quotedTweetEntity.meta) return;
		await db.entities.delete(`tweet-${meta.quoteOf}`);
		await db.entities.delete(
			`user-${(quotedTweetEntity.meta as TweetEntityMeta).user}`,
		);
	}

	await db.entities.delete(`tweet-${id}`);
	await db.entities.delete(`user-${meta.user}`);
};

export const updateEntitiesFromPayload = async (
	payload: AddEntitiesPayload,
) => {
	for (const [k, v] of Object.entries(payload.tweets ?? {}))
		await db.entities.update(`tweet-${k}`, { data: await compressObject(v) });
	for (const [k, v] of Object.entries(payload.users ?? {}))
		await db.entities.update(`user-${k}`, { data: await compressObject(v) });
};

export const getTweetEntityPayload = async (
	id: string,
): Promise<AddEntitiesPayload> => {
	const rawTweetEntity = await db.entities.get(`tweet-${id}`);
	if (!rawTweetEntity) throw new Error(`entity tweet-${id} not found`);
	const tweetEntity: RawTweet = await decompressObject(rawTweetEntity.data);

	const rawUserEntity = await db.entities.get(`user-${tweetEntity.user}`);
	if (!rawUserEntity)
		throw new Error(
			`entity user-${tweetEntity.user} not found (needed for tweet-${id})`,
		);
	const userEntity: RawTweetUser = await decompressObject(rawUserEntity.data);

	const payload = {
		tweets: { [id]: tweetEntity },
		users: { [tweetEntity.user]: userEntity },
	};
	return tweetEntity.quoted_status
		? mergician(payload, await getTweetEntityPayload(tweetEntity.quoted_status))
		: payload;
};
