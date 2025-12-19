import { compressObject, decompressObject } from "@/src/helpers/compression";
import { type AddEntitiesPayload, getUserEntity } from "@/src/internals/redux";
import type { RawTweet, RawTweetUser } from "@/src/types/tweet";
import { mergician } from "mergician";
import { db } from "./definition";

export const putTweetEntity = async (entity?: RawTweet) => {
	if (!entity) return;
	const userEntity = getUserEntity(entity.user);
	await db.entities.put({
		key: `user-${userEntity.id_str}`,
		type: "user",
		data: await compressObject(userEntity),
	});
	await db.entities.put({
		key: `tweet-${entity.id_str}`,
		type: "tweet",
		data: await compressObject(entity),
	});
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
	console.log(payload);
	return tweetEntity.quoted_status
		? mergician(payload, await getTweetEntityPayload(tweetEntity.quoted_status))
		: payload;
};
