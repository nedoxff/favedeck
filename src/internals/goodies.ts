import { Result, type UnhandledException } from "better-result";
import * as bippy from "bippy";
import { memoize } from "micro-memoize";
import { getSetting } from "../features/storage/settings";
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
) => {
	const includeQuoteTweets = await getSetting("includeQuoteTweets");
	const convertEntity = (
		id?: string,
	): Result<TweetMasonryInfo[], UnhandledException> =>
		Result.gen(function* () {
			{
				if (!id || !tweetEntityLoaded(id)) return Result.ok([]);
				const tweetEntity = yield* getTweetEntity(id);
				const authorEntity = yield* getUserEntity(tweetEntity.user);
				return Result.ok([
					...getMediaInfo(tweetEntity, quality).map((i) => ({
						author: {
							id: tweetEntity.user,
							name: authorEntity.screen_name,
							profileImage: authorEntity.profile_image_url_https,
						},
						id: `${id}-${i.index}`,
						tweet: id,
						info: i,
					})),
					...(includeQuoteTweets
						? convertEntity(tweetEntity.quoted_status).unwrapOr([])
						: []),
				]);
			}
		});
	return convertEntity(tweet);
};

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
