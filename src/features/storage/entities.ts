import { Result, type UnhandledException } from "better-result";
import { getProperty } from "dot-prop";
import { mergician } from "mergician";
import { compressObject, decompressObject } from "@/src/helpers/compression";
import {
	type AddEntitiesPayload,
	getTweetEntity,
	getUserEntity,
	tweetEntityLoaded,
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

export const isTweetBookmarked = async (tweet: string) => {
	if (tweetEntityLoaded(tweet)) getTweetEntity(tweet).map((e) => e.bookmarked);
	const dbEntity = await db.entities.get(`tweet-${tweet}`);
	if (dbEntity)
		return Result.ok(
			((await decompressObject(dbEntity.data)) as RawTweet).bookmarked,
		);
	return Result.err(
		new Error(
			"cannot determine whether tweet is bookmarked (not present in redux nor database)",
		),
	);
};

export const getTweetEntityPayloadFromReduxStore = async (tweet: string) => {
	const payload: Required<AddEntitiesPayload> = {
		tweets: {},
		users: {},
		favedeck: { quoteOf: {}, user: {} },
	};
	const addTweet = (id: string): Result<void, UnhandledException> =>
		Result.gen(function* () {
			if (!tweetEntityLoaded(id)) return Result.ok();
			const tweetEntity = yield* getTweetEntity(id);
			payload.tweets[tweetEntity.id_str] = tweetEntity;
			payload.users[tweetEntity.user] = yield* getUserEntity(tweetEntity.user);
			payload.favedeck.user[tweetEntity.id_str] = tweetEntity.user;
			if (tweetEntity.quoted_status) {
				yield* addTweet(tweetEntity.quoted_status);
				payload.favedeck.quoteOf[tweetEntity.quoted_status] =
					tweetEntity.id_str;
			}
			return Result.ok();
		});
	return addTweet(tweet).map(() => payload);
};

export const getTweetEntityPayloadFromDatabase = async (id: string) =>
	Result.tryPromise(async (): Promise<AddEntitiesPayload> => {
		const rawTweetEntity = await db.entities.get(`tweet-${id}`);
		if (!rawTweetEntity) throw new Error(`entity tweet-${id} not found`);
		const tweetEntity: RawTweet = await decompressObject(rawTweetEntity.data);

		const rawUserEntity = await db.entities.get(`user-${tweetEntity.user}`);
		if (!rawUserEntity)
			throw new Error(
				`entity user-${tweetEntity.user} not found (needed for tweet-${id})`,
			);
		const userEntity: RawTweetUser = await decompressObject(rawUserEntity.data);

		const meta = {
			quoteOf: getProperty(rawTweetEntity.meta, "quoteOf") as
				| string
				| undefined,
			user: getProperty(rawTweetEntity.meta, "user") as string | undefined,
		};
		const payload: AddEntitiesPayload = {
			tweets: { [id]: tweetEntity },
			users: { [tweetEntity.user]: userEntity },
			favedeck: {
				quoteOf: meta.quoteOf ? { [id]: meta.quoteOf } : {},
				user: meta.user ? { [id]: meta.user } : {},
			},
		};
		return tweetEntity.quoted_status
			? mergician(
					payload,
					(
						await getTweetEntityPayloadFromDatabase(tweetEntity.quoted_status)
					).unwrapOr([]),
				)
			: payload;
	});
