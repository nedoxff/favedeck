import * as bippy from "bippy";
import type { RawTweet } from "../types/tweet";
import { findParentNode, matchers } from "./matchers";

export const getThumbnailUrl = (tweet?: RawTweet): string | undefined => {
	if (!tweet || !tweet.entities.media) return undefined;
	const eligibleEntities = tweet.entities.media.filter(
		(m) => m.type === "photo" || m.type === "video",
	);
	if (eligibleEntities.length === 0) return undefined;
	return `${eligibleEntities[0].media_url_https}?name=small`;
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
