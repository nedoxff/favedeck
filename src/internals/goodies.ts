import { Result } from "better-result";
import * as bippy from "bippy";
import { getProperty } from "dot-prop";
import { memoize } from "micro-memoize";
import type { RawTweet } from "../types/tweet";
import { findParentNode, matchers } from "./matchers";
import { getTweetEntity, getUserEntity, tweetEntityLoaded } from "./redux";

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
	return eligibleEntities.map((entity, idx) =>
		entity.type === "photo"
			? {
					url: `${entity.media_url_https}?name=${quality}`,
					thumbnail: `${entity.media_url_https}?name=thumb`,
					width: entity.sizes[quality].w,
					height: entity.sizes[quality].h,
					index: idx + 1,
					type: entity.type,
				}
			: {
					url:
						// biome-ignore lint/style/noNonNullAssertion: nuh uh
						entity
							.video_info!.variants.filter(
								(v) =>
									v.bitrate !== undefined &&
									v.content_type !== "application/x-mpegURL",
							)
							.sort((a, b) => (a.bitrate ?? 0) - (b.bitrate ?? 0))
							.at(0)?.url ?? "",
					thumbnail: `${entity.media_url_https}?name=thumb`,
					width: entity.original_info.width,
					height: entity.original_info.height,
					index: idx + 1,
					type: entity.type,
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
export const convertDatabaseTweetToMasonryInfos = async (
	tweet: string,
	quality = "small",
): Promise<Result<TweetMasonryInfo[], Error>> =>
	Result.gen(async function* () {
		{
			if (!tweet || !tweetEntityLoaded(tweet)) return Result.ok([]);
			const tweetEntity = yield* getTweetEntity(tweet);
			const authorEntity = yield* getUserEntity(tweetEntity.user);
			return Result.ok(
				getMediaInfo(tweetEntity, quality).map(
					(info) =>
						({
							author: {
								id: tweetEntity.user,
								name: authorEntity.screen_name,
								profileImage: authorEntity.profile_image_url_https,
							},
							id: `${tweet}-${info.index}`,
							tweet,
							info,
						}) satisfies TweetMasonryInfo,
				),
			);
		}
	});

export const findTweetFiber = (anyFiber: bippy.Fiber) =>
	bippy.traverseFiber(
		anyFiber,
		(f) => bippy.getDisplayName(f) === "Tweet",
		true,
	);

export const getTweetIdFromFiber = (tweetFiber: bippy.Fiber) =>
	Result.try(() => {
		if (bippy.getDisplayName(tweetFiber) !== "Tweet")
			throw new Error('bippy.getDisplayName(fiber) !== "Tweet"');
		const tweet: RawTweet = tweetFiber.memoizedProps?.tweet as RawTweet;
		if (!tweet)
			throw new Error(
				"the tweet fiber (somehow) doesn't have the tweet in memoizedProps",
			);
		return tweet.id_str;
	});

export type RootNodeInfo = { rootNode: HTMLElement; id: string };
export const getRootNodeFromTweetElement = memoize((el: HTMLElement) =>
	Result.try(() => {
		const anyFiber = bippy.getFiberFromHostInstance(el);
		if (!anyFiber) throw new Error("couldn't find a fiber for HTMLElement");
		const tweetFiber = findTweetFiber(anyFiber);
		if (!tweetFiber) throw new Error("couldn't find Tweet fiber from anyFiber");
		const rootNode = findParentNode(el, matchers.tweetRoot.matcher);
		if (!rootNode) throw new Error("couldn't find root node element");
		const id = getTweetIdFromFiber(tweetFiber);
		if (id.isErr())
			throw new Error("couldn't find tweet id from tweetFiber", {
				cause: id.error.cause,
			});
		return {
			rootNode,
			id: id.value,
		};
	}),
);

export const pauseTweetVideo = (video: HTMLVideoElement) => {
	const fiber = bippy.getFiberFromHostInstance(video);
	if (!fiber) return Result.err("couldn't get host fiber from video element");
	const playerFiber = bippy.traverseFiber(
		fiber,
		(f) => {
			return getProperty(f, "memoizedProps.value.playerApi") !== undefined;
		},
		true,
	);
	if (!playerFiber)
		return Result.err("couldn't find fiber which had the playerApi");
	// @ts-expect-error
	playerFiber.memoizedProps.value.playerApi.pause();
	return Result.ok();
};
