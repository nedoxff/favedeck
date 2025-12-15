import type { RawTweet } from "../types/tweet";

export const getThumbnailUrl = (tweet?: RawTweet): string | undefined => {
	if (!tweet || !tweet.entities.media) return undefined;
	const eligibleEntities = tweet.entities.media.filter(
		(m) => m.type === "photo" || m.type === "video",
	);
	if (eligibleEntities.length === 0) return undefined;
	return `${eligibleEntities[0].media_url_https}?name=small`;
};
