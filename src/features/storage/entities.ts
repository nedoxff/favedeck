import { mergician } from "mergician";
import { compressObject, decompressObject } from "@/src/helpers/compression";
import {
	type AddEntitiesPayload,
	getTweetEntity,
	getUserEntity,
} from "@/src/internals/redux";
import type { RawTweet, RawTweetUser } from "@/src/types/tweet";
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

	const removeUserEntityIfPossible = async (user: string) => {
		// this should be called after already removing the tweet entity
		if ((await db.entities.where("meta.user").equals(user).count()) > 0) return;
		await db.entities.delete(`user-${user}`);
	};

	const meta = tweetEntity.meta as TweetEntityMeta;
	if (meta.quoteOf) {
		const canSafelyRemoveQuoteTweet =
			(await db.entities.where("meta.quoteOf").equals(meta.quoteOf).count()) <=
			1;
		console.log("can safely remove quote tweet", canSafelyRemoveQuoteTweet);
		if (!canSafelyRemoveQuoteTweet) return;

		const quotedTweetEntity = await db.entities.get(`tweet-${meta.quoteOf}`);
		if (!quotedTweetEntity || !quotedTweetEntity.meta) return;
		await db.entities.delete(`tweet-${meta.quoteOf}`);
		await removeUserEntityIfPossible(
			(quotedTweetEntity.meta as TweetEntityMeta).user,
		);
	}

	await db.entities.delete(`tweet-${id}`);
	await removeUserEntityIfPossible(meta.user);
};

export const updateEntitiesFromPayload = async (
	payload: AddEntitiesPayload,
) => {
	for (const [k, v] of Object.entries(payload.tweets ?? {}))
		await db.entities.update(`tweet-${k}`, { data: await compressObject(v) });
	for (const [k, v] of Object.entries(payload.users ?? {}))
		await db.entities.update(`user-${k}`, { data: await compressObject(v) });
};

export const getTweetEntityIds = async (id: string) => {
	const rawTweetEntity = await db.entities.get(`tweet-${id}`);
	if (rawTweetEntity) {
		const quoteOf = (rawTweetEntity.meta as TweetEntityMeta).quoteOf;
		return quoteOf ? [id, quoteOf] : [id];
	}
	return [id];
};

export const getTweetEntityPayloadFromReduxStore = async (
	tweet: string,
): Promise<AddEntitiesPayload> => {
	const payload: AddEntitiesPayload = {
		tweets: {},
		users: {},
		favedeck: { quoteOf: {} },
	};
	const addTweet = (id: string) => {
		if (!payload.tweets || !payload.users || !payload.favedeck) return;
		try {
			const tweetEntity = getTweetEntity(id);
			payload.tweets[tweetEntity.id_str] = tweetEntity;
			payload.users[tweetEntity.user] = getUserEntity(tweetEntity.user);
			if (tweetEntity.quoted_status) {
				addTweet(tweetEntity.quoted_status);
				payload.favedeck.quoteOf[tweetEntity.quoted_status] =
					tweetEntity.id_str;
			}
		} catch (err) {
			console.warn("failed to add tweet", tweet, "to AddEntitiesPayload", err);
		}
	};
	addTweet(tweet);
	return payload;
};

export const getTweetEntityPayloadFromDatabase = async (
	id: string,
): Promise<AddEntitiesPayload> => {
	const rawTweetEntity = await db.entities.get(`tweet-${id}`);
	if (!rawTweetEntity) {
		console.warn(`entity tweet-${id} not found`);
		return {};
	}
	const tweetEntity: RawTweet = await decompressObject(rawTweetEntity.data);

	const rawUserEntity = await db.entities.get(`user-${tweetEntity.user}`);
	if (!rawUserEntity) {
		console.warn(
			`entity user-${tweetEntity.user} not found (needed for tweet-${id})`,
		);
		return {};
	}
	const userEntity: RawTweetUser = await decompressObject(rawUserEntity.data);

	const payload = {
		tweets: { [id]: tweetEntity },
		users: { [tweetEntity.user]: userEntity },
	};
	return tweetEntity.quoted_status
		? mergician(
				payload,
				await getTweetEntityPayloadFromDatabase(tweetEntity.quoted_status),
			)
		: payload;
};
