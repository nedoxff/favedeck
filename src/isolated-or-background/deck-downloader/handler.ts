import { Result } from "better-result";
import sanitize from "sanitize-filename";
import { messenger } from "@/src/helpers/messaging/extension";
import { sendToContent } from "@/src/helpers/messaging/utils";
import { type DeckDownloaderArgumentList, download } from "./downloader";
import {
	type DeckDownloaderHandler,
	type DeckDownloaderState,
	deckDownloader,
} from "./root";

export default (() => {
	let _abortController: AbortController;
	let _state: DeckDownloaderState;
	let _continuousUpdates: boolean;
	let streamSaver: typeof import("streamsaver") | undefined;

	const updateState: DeckDownloaderArgumentList["updateState"] = async (
		transformer,
	) => {
		_state = transformer(_state);
		deckDownloader.handleMessage({
			type: "updateState",
			data: { newState: _state },
		});
		if (_continuousUpdates)
			await sendToContent((tab) =>
				messenger.sendMessage("deckDownloader:forwardUpdate", _state, tab),
			);
	};

	return {
		abortDownload: async () => _abortController.abort(),
		beginDownload: (configuration) =>
			Result.tryPromise(async () => {
				if (!streamSaver) streamSaver = await import("streamsaver");
				_abortController = new AbortController();
				_state = {
					state: "processing",
					progress: {
						current: 0,
						skipped: 0,
						total: configuration.tweets.length,
					},
				};

				const stream = streamSaver.createWriteStream(
					sanitize(`${configuration.deck.name}.zip`),
				);
				download({
					configuration,
					stream,
					abortSignal: _abortController.signal,
					updateState,
				}).then((result) =>
					updateState(() =>
						result.match<DeckDownloaderState>({
							ok: () => ({ state: "complete" }),
							err: (e) => ({ state: "idle", error: e }),
						}),
					),
				);
			}),
		receiveState: async () => Result.ok(_state),
		updateState: async (newState) => {
			_state = newState;
		},
		toggleContinuousUpdates: async (enabled) => {
			_continuousUpdates = enabled;
		},
	};
})() satisfies DeckDownloaderHandler;
