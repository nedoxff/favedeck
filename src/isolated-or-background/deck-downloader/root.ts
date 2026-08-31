import { Result } from "better-result";
import { messenger } from "@/src/helpers/messaging/extension";
import { sendToContent } from "@/src/helpers/messaging/utils";
import type {
	DatabaseDeck,
	DatabaseTweet,
} from "../../features/storage/definition";

export const DECK_DOWNLOADER_MEDIA_TYPES = [
	"images",
	"videos",
	"gifs",
	"text",
] as const;
export type DeckDownloaderMediaType =
	(typeof DECK_DOWNLOADER_MEDIA_TYPES)[number];
export type DeckDownloaderFilenameOption = "handle" | "size" | "date";
export type DeckDownloaderOptions = {
	includeQuotes: boolean;
	media: DeckDownloaderMediaType[];
	filenameOptions: DeckDownloaderFilenameOption[];
};
export interface DeckDownloaderEvents {
	prepare: { deck: DatabaseDeck; tweets: DatabaseTweet[] };
	pushEntity: { key: string; payload: Array<number> };
	beginDownload: {
		options: DeckDownloaderOptions;
	};
	abortDownload: Record<string, never>;

	requestState: Record<string, never>;
	updateState: { newState: DeckDownloaderState };
	toggleContinuousUpdates: { enabled: boolean };
}
export type DeckDownloaderMessage = {
	[K in keyof DeckDownloaderEvents]: { type: K; data: DeckDownloaderEvents[K] };
}[keyof DeckDownloaderEvents];

export type DeckDownloaderCompleteConfiguration = {
	entities: Record<string, Array<number>>;
	options: DeckDownloaderOptions;
	deck: DatabaseDeck;
	tweets: DatabaseTweet[];
};

export type DeckDownloaderState = {
	state: "idle" | "processing" | "complete";
	error?: Error;
	progress?: { current: number; total: number; skipped: number };
};

export interface DeckDownloader {
	handleMessage: (message: DeckDownloaderMessage) => Promise<void>;
	receiveState: () => Promise<Result<DeckDownloaderState, Error>>;
}

export interface DeckDownloaderHandler {
	receiveState: () => Promise<Result<DeckDownloaderState, Error>>;
	updateState: (newState: DeckDownloaderState) => Promise<void>;
	beginDownload: (
		configuration: DeckDownloaderCompleteConfiguration,
	) => Promise<Result<void, Error>>;
	abortDownload: () => Promise<void>;
	toggleContinuousUpdates: (enabled: boolean) => Promise<void>;
}

export const deckDownloader: DeckDownloader = (() => {
	const _currentConfiguration: Partial<DeckDownloaderCompleteConfiguration> =
		{};
	let _handler: DeckDownloaderHandler | undefined;
	let _lastState: DeckDownloaderState | undefined;

	return {
		async handleMessage(message) {
			switch (message.type) {
				case "prepare": {
					_currentConfiguration.deck = message.data.deck;
					_currentConfiguration.tweets = message.data.tweets;
					if (!_handler) {
						console.log(
							`initializing handler | offscreen: ${typeof window === "undefined"}`,
						);
						_handler =
							typeof window === "undefined"
								? (await import("./handler-offscreen")).default
								: (await import("./handler")).default;
					}
					break;
				}
				case "pushEntity": {
					_currentConfiguration.entities ??= {};
					_currentConfiguration.entities[message.data.key] =
						message.data.payload;
					break;
				}
				case "beginDownload": {
					_currentConfiguration.options = message.data.options;
					if (
						!_currentConfiguration.deck ||
						!_currentConfiguration.tweets ||
						!_currentConfiguration.entities ||
						!_currentConfiguration.options
					) {
						_lastState = {
							state: "idle",
							error: new Error(
								"Not enough data provided for the DeckDownloader to function",
							),
						};
						return;
					}

					if (!_handler) {
						_lastState = {
							state: "idle",
							error: new Error("Handler wasn't imported to start download"),
						};
						return;
					}

					const handlerResult = await _handler.beginDownload(
						_currentConfiguration as DeckDownloaderCompleteConfiguration,
					);
					if (handlerResult.isErr()) {
						_lastState = {
							state: "idle",
							error: new Error("Handler couldn't begin download", {
								cause: handlerResult.error,
							}),
						};
					}
					break;
				}
				case "abortDownload": {
					await _handler?.abortDownload();
					break;
				}
				case "updateState": {
					_lastState = message.data.newState;
					break;
				}
				case "toggleContinuousUpdates": {
					await _handler?.toggleContinuousUpdates(message.data.enabled);
					break;
				}
				case "requestState": {
					await sendToContent((tab) =>
						messenger.sendMessage(
							"deckDownloader:forwardUpdate",
							_lastState ?? { state: "idle" },
							tab,
						),
					);
					break;
				}
			}
		},
		async receiveState() {
			if (!_handler)
				return Result.err(
					new Error("Handler wasn't imported to receive state"),
				);
			const result = await _handler.receiveState();
			if (result.isOk()) _lastState = result.value;
			return result;
		},
	};
})();
