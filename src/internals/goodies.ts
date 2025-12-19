import * as bippy from "bippy";
import type { DatabaseTweet } from "../features/storage/definition";
import type { RawTweet } from "../types/tweet";
import { findParentNode, matchers } from "./matchers";
import { getTweetEntity, getUserEntity } from "./redux";

type MediaInfo = {
	url: string;
	width: number;
	height: number;
};
export const getMediaInfo = (
	tweet?: RawTweet,
	quality: string = "small",
): MediaInfo[] => {
	if (!tweet || !tweet.entities.media) return [];
	const eligibleEntities = tweet.entities.media.filter(
		(m) => m.type === "photo" || m.type === "video",
	);
	return eligibleEntities.map((ee) => ({
		url: `${ee.media_url_https}?name=${quality}`,
		width: ee.sizes[quality].w,
		height: ee.sizes[quality].h,
	}));
};

export const getThumbnailUrl = (tweet?: RawTweet): string | undefined =>
	getMediaInfo(tweet).at(0)?.url;

export type TweetMasonryInfo = {
	id: string;
	author: string;
	info: MediaInfo;
	authorProfileImage: string;
};
// this must be called AFTER adding the entities
export const convertDatabaseTweetToMasonryInfos = (
	tweet: DatabaseTweet,
	quality = "small",
): TweetMasonryInfo[] => {
	const authorEntity = getUserEntity(tweet.author);
	const tweetEntity = getTweetEntity(tweet.id);
	const infos = [
		...getMediaInfo(tweetEntity, quality),
		...(tweetEntity.quoted_status
			? getMediaInfo(getTweetEntity(tweetEntity.quoted_status), quality)
			: []),
	];
	return infos.map((i) => ({
		author: tweet.author,
		authorProfileImage: authorEntity.profile_image_url_https,
		id: tweet.id,
		info: i,
	}));
};

export const getTweetIdFromFiber = (fiber: bippy.Fiber): string => {
	const tweet: RawTweet = fiber.memoizedProps?.tweet as RawTweet;
	if (!tweet)
		throw new Error(
			"the tweet fiber (somehow) doesn't have the tweet in memoizedProps",
		);
	return tweet.id_str;
};

export const getTweetInfoFromElement = (
	el: HTMLElement,
): { rootNode: HTMLElement; fiber: bippy.Fiber; id: string } | null => {
	const fiber = bippy.getFiberFromHostInstance(el);
	const tweetFiber = bippy.traverseFiber(
		fiber,
		(f) => bippy.getDisplayName(f) === "Tweet",
		true,
	);
	if (!tweetFiber) return null;
	const rootNode = findParentNode(el, matchers.tweetRoot.matcher);
	if (!rootNode) return null;
	return {
		rootNode,
		fiber: tweetFiber,
		id: getTweetIdFromFiber(tweetFiber),
	};
};
