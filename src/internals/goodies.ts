import * as bippy from "bippy";
import { memoize } from "micro-memoize";
import type { DatabaseTweet } from "../features/storage/definition";
import type { RawTweet } from "../types/tweet";
import { findParentNode, matchers } from "./matchers";
import { getTweetEntity, getUserEntity } from "./redux";

export type MediaInfo = {
	url: string;
	thumbnail: string;
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
	const eligibleEntities = tweet.entities.media.filter((m) =>
		["photo", "video", "animated_gif"].includes(m.type),
	);
	return eligibleEntities.map((ee, idx) =>
		ee.type === "photo"
			? {
					url: `${ee.media_url_https}?name=${quality}`,
					thumbnail: `${ee.media_url_https}?name=thumb`,
					width: ee.sizes[quality].w,
					height: ee.sizes[quality].h,
					index: idx + 1,
					type: ee.type,
				}
			: {
					url:
						// biome-ignore lint/style/noNonNullAssertion: nuh uh
						ee
							.video_info!.variants.filter(
								(v) =>
									v.bitrate !== undefined &&
									v.content_type !== "application/x-mpegURL",
							)
							.sort((a, b) => (a.bitrate ?? 0) - (b.bitrate ?? 0))
							.at(0)?.url ?? "",
					thumbnail: `${ee.media_url_https}?name=thumb`,
					width: ee.original_info.width,
					height: ee.original_info.height,
					index: idx + 1,
					type: ee.type,
				},
	);
};

export const getThumbnailUrl = (tweet?: RawTweet): string | undefined => {
	const info = getMediaInfo(tweet, "thumb").at(0);
	return info ? (info.type === "photo" ? info.url : info.thumbnail) : undefined;
};

export type TweetMasonryInfo = {
	id: string;
	author: {
		id: string;
		name: string;
		profileImage: string;
	};
	tweet: string;
	info: MediaInfo;
};
// this must be called AFTER adding the entities
export const convertDatabaseTweetToMasonryInfos = (
	tweet: DatabaseTweet,
	quality = "small",
): TweetMasonryInfo[] => {
	const tweetEntity = getTweetEntity(tweet.id);
	const authorEntity = getUserEntity(tweetEntity.user);
	const infos = [
		...getMediaInfo(tweetEntity, quality),
		...(tweetEntity.quoted_status
			? getMediaInfo(getTweetEntity(tweetEntity.quoted_status), quality)
			: []),
	];
	return infos.map((i) => ({
		author: {
			id: tweetEntity.user,
			name: authorEntity.screen_name,
			profileImage: authorEntity.profile_image_url_https,
		},
		id: `${tweet.id}-${i.index}`,
		tweet: tweet.id,
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

export type RootNodeInfo = { rootNode: HTMLElement; id: string };
export const getRootNodeFromTweetElement = memoize(
	(el: HTMLElement): RootNodeInfo | null => {
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
