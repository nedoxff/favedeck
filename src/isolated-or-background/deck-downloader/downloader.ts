import { TextReader, ZipWriter } from "@zip.js/zip.js";
import { Result } from "better-result";
import { decompressObject } from "@/src/helpers/compression";
import type { RawTweet, RawTweetMedia, RawTweetUser } from "@/src/types/tweet";
import {
	DECK_DOWNLOADER_MEDIA_TYPES,
	type DeckDownloaderCompleteConfiguration,
	type DeckDownloaderMediaType,
	type DeckDownloaderState,
} from "./root";

export type DeckDownloaderArgumentList = {
	configuration: DeckDownloaderCompleteConfiguration;
	stream: WritableStream;
	abortSignal: AbortSignal;
	updateState: (
		transformer: (current: DeckDownloaderState) => DeckDownloaderState,
	) => Promise<void>;
};

export const download = ({
	configuration,
	stream,
	abortSignal,
	updateState,
}: DeckDownloaderArgumentList) =>
	Result.tryPromise(async () => {
		const archive = new ZipWriter(stream);
		const progress: DeckDownloaderState["progress"] = {
			current: 0,
			skipped: 0,
			total: configuration.tweets.length,
		};

		const process = async (tweet: string) => {
			if (abortSignal.aborted) return;
			try {
				const entity = configuration.entities[`tweet-${tweet}`];
				if (!entity) throw new Error(`entity tweet-${tweet} not found`);
				const rawTweet = (await decompressObject(
					new Blob([new Uint8Array(entity).buffer]),
				)) as RawTweet;

				const userEntity = configuration.entities[`user-${rawTweet.user}`];
				if (!userEntity)
					throw new Error(`entity user-${rawTweet.user} not found`);
				const rawUser = (await decompressObject(
					new Blob([new Uint8Array(userEntity).buffer]),
				)) as RawTweetUser;

				if (configuration.options.media.includes("text")) {
					await archive.add(
						`text/${tweet}.json`,
						new TextReader(
							JSON.stringify({ tweet: rawTweet, user: rawUser }, undefined, 4),
						),
						{ useWebWorkers: false },
					);
				}

				for (const media of getMedia(rawTweet)) {
					if (!configuration.options.media.includes(media.type)) continue;
					const response = await fetch(media.bestUrl);
					if (!response.ok || !response.body)
						throw new Error(
							`failed to fetch media for tweet ${tweet}: ${media.bestUrl}`,
						);

					let filename = `${media.id} `;
					if (configuration.options.filenameOptions.includes("handle"))
						filename += `(@${rawUser.screen_name}) `;
					if (configuration.options.filenameOptions.includes("size"))
						filename += `[${media.size.width}x${media.size.height}] `;
					if (configuration.options.filenameOptions.includes("date"))
						filename += `[${new Date(rawTweet.created_at).toLocaleDateString().replaceAll("/", "-").replaceAll(".", "-")}] `;

					await archive.add(
						`${media.type}/${filename.trim()}.${media.extension}`,
						response.body,
						{ useWebWorkers: false },
					);
				}

				if (rawTweet.quoted_status && configuration.options.includeQuotes) {
					try {
						await process(rawTweet.quoted_status);
					} catch (quoteErr) {
						throw new Error(
							`error while processing quoted tweet ${rawTweet.quoted_status} (parent is ${tweet})`,
							{ cause: quoteErr },
						);
					}
				}
			} catch (err) {
				console.error(`couldn't process tweet`, err);
				progress.skipped++;
				await updateState((curr) => ({ ...curr, progress }));
			}
		};

		for (const media of DECK_DOWNLOADER_MEDIA_TYPES) {
			if (!configuration.options.media.includes(media)) continue;
			await archive.add(media, undefined, {
				directory: true,
				useWebWorkers: false,
			});
		}

		for (const tweet of configuration.tweets) {
			console.log(`processing ${tweet.id}`);
			await process(tweet.id);
			progress.current++;
			await updateState((curr) => ({ ...curr, progress }));
		}

		await archive.close();
		await stream.close();
	});

export type TweetMedia = {
	type: DeckDownloaderMediaType;
	id: string;
	bestUrl: string;
	extension: string;
	size: {
		width: number;
		height: number;
	};
};

const convertMedia = (media: RawTweetMedia): TweetMedia => {
	switch (media.type) {
		case "photo": {
			const pathname = new URL(media.media_url_https).pathname;
			const realId = pathname.split("/").pop()?.split(".").shift() ?? "";
			const extension = pathname.split("/").pop()?.split(".").pop() ?? "";

			return {
				type: "images",
				id: realId,
				extension: extension,
				bestUrl: `${media.media_url_https}?name=orig`,
				size: {
					width: media.original_info.width,
					height: media.original_info.height,
				},
			} satisfies TweetMedia;
		}
		case "animated_gif":
		case "video": {
			if (media.video_info === undefined) {
				throw new Error(
					"cannot convert a video entity without media.video_info",
				);
			}

			let bestUrl = media.video_info.variants.sort(
				(a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0),
			)[0].url;

			const urlObject = new URL(bestUrl);
			urlObject.search = "";

			bestUrl = urlObject.toString();
			const extension =
				urlObject.pathname.split("/").pop()?.split(".").pop() ?? "";
			return {
				type: media.type === "video" ? "videos" : "gifs",
				id: media.id_str,
				extension: extension,
				bestUrl: bestUrl,
				size: {
					width: media.original_info.width,
					height: media.original_info.height,
				},
			} satisfies TweetMedia;
		}
		default: {
			throw new Error(`unknown media type: ${media.type}`);
		}
	}
};

export const getMedia = (tweet: RawTweet): TweetMedia[] =>
	(tweet.entities.media ?? []).map(convertMedia);
