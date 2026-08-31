import sanitize from "sanitize-filename";
import streamSaver from "streamsaver";
import { offscreenMessenger } from "@/src/helpers/messaging/offscreen";
import {
	type DeckDownloaderArgumentList,
	download,
} from "@/src/isolated-or-background/deck-downloader/downloader";
import type { DeckDownloaderState } from "@/src/isolated-or-background/deck-downloader/root";

console.log("i love you chromium mv3");

let _abortController: AbortController = new AbortController();
let _state: DeckDownloaderState = { state: "idle" };
let _continuousUpdates: boolean = false;

const updateState: DeckDownloaderArgumentList["updateState"] = async (
	transformer,
) => {
	_state = transformer(_state);
	await offscreenMessenger.sendMessage("ODD:updateState", {
		newState: _state,
		forward: _continuousUpdates,
	});
};

offscreenMessenger.onMessage("ODD:abort", () => _abortController.abort());
offscreenMessenger.onMessage("ODD:begin", (message) => {
	_abortController = new AbortController();
	_state = {
		state: "processing",
		progress: {
			current: 0,
			skipped: 0,
			total: message.data.tweets.length,
		},
	};

	const stream = streamSaver.createWriteStream(
		sanitize(`${message.data.deck.name}.zip`),
	);
	download({
		configuration: message.data,
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
});
offscreenMessenger.onMessage("ODD:receiveState", () => _state);
offscreenMessenger.onMessage("ODD:updateState", (message) => {
	_state = message.data.newState;
});
offscreenMessenger.onMessage("ODD:toggleContinuousUpdates", (message) => {
	_continuousUpdates = message.data;
});
