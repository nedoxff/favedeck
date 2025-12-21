import * as bippy from "bippy";
import { memoize } from "micro-memoize";
import type { DatabaseTweet } from "../features/storage/definition";
import type { RawTweet } from "../types/tweet";
import { findParentNode, matchers } from "./matchers";
import { getTweetEntity, getUserEntity } from "./redux";

type MediaInfo = {
	url: string;
	width: number;
	height: number;
	type: string;
	index: number;
};
export const getMediaInfo = (
	tweet?: RawTweet,
	quality: string = "small",
): MediaInfo[] => {
	if (!tweet || !tweet.entities.media) return [];
	const eligibleEntities = tweet.entities.media.filter(
		(m) => m.type === "photo" || m.type === "video",
	);
	return eligibleEntities.map((ee, idx) => ({
		url: `${ee.media_url_https}?name=${quality}`,
		width: ee.sizes[quality].w,
		height: ee.sizes[quality].h,
		index: idx + 1,
		type: ee.type,
	}));
};

export const getThumbnailUrl = (tweet?: RawTweet): string | undefined =>
	getMediaInfo(tweet).at(0)?.url;

export type TweetMasonryInfo = {
	id: string;
	author: {
		id: string;
		name: string;
		profileImage: string;
	};
	info: MediaInfo;
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
		author: {
			id: tweet.author,
			name: authorEntity.screen_name,
			profileImage: authorEntity.profile_image_url_https,
		},
		id: tweet.id,
		info: i,
	}));
};

export const findTweetFiber = (anyFiber: bippy.Fiber) =>
	bippy.traverseFiber(
		anyFiber,
		(f) => bippy.getDisplayName(f) === "Tweet",
		true,
	);

export const getTweetIdFromFiber = (tweetFiber: bippy.Fiber): string => {
	if (bippy.getDisplayName(tweetFiber) !== "Tweet")
		throw new Error('bippy.getDisplayName(fiber) !== "Tweet"');
	const tweet: RawTweet = tweetFiber.memoizedProps?.tweet as RawTweet;
	if (!tweet)
		throw new Error(
			"the tweet fiber (somehow) doesn't have the tweet in memoizedProps",
		);
	return tweet.id_str;
};

export const getRootNodeFromTweetElement = memoize(
	(el: HTMLElement): { rootNode: HTMLElement; id: string } | null => {
		const anyFiber = bippy.getFiberFromHostInstance(el);
		if (!anyFiber) return null;
		const tweetFiber = findTweetFiber(anyFiber);
		if (!tweetFiber) return null;
		const rootNode = findParentNode(el, matchers.tweetRoot.matcher);
		if (!rootNode) return null;
		return {
			rootNode,
			id: getTweetIdFromFiber(tweetFiber),
		};
	},
);
