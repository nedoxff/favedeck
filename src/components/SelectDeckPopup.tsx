/** biome-ignore-all lint/a11y/useFocusableInteractive: TODO */
/** biome-ignore-all lint/a11y/useSemanticElements: TODO */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: TODO */

import { Result } from "better-result";
import * as bippy from "bippy";
import { useLiveQuery } from "dexie-react-hooks";
import { createPortal } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import BookmarkIcon from "~icons/mdi/bookmark";
import LockIcon from "~icons/mdi/lock";
import PlusIcon from "~icons/mdi/plus";
import { decksEventTarget } from "../features/events/decks";
import { tweetsEventTarget } from "../features/events/tweets";
import {
	getDeckThumbnails,
	getUserDecksAutomatically,
} from "../features/storage/decks";
import type { DatabaseDeck } from "../features/storage/definition";
import {
	addTweetToDeck,
	isTweetInDeck,
	isTweetInSpecificDeck,
	removeTweet,
} from "../features/storage/tweets";
import { findTweetFiber, getTweetIdFromFiber } from "../internals/goodies";
import { findParentNode, matchers } from "../internals/matchers";
import { unbookmarkTweet } from "../internals/redux";
import CreateDeckModal from "./modals/CreateDeckModal";
import { components } from "./wrapper";

enum DeckCardState {
	IDLE,
	SAVING,
	SAVED,
	REMOVING,
	REMOVED,
	ERROR,
}

const saveTweet = async (tweet: string, deck: string) => {
	const result = await addTweetToDeck(tweet, deck);
	if (result.isErr()) return result;

	if (components.SelectDeckPopup.initiator) {
		const tweetNode = findParentNode(
			components.SelectDeckPopup.initiator,
			matchers.tweetRoot.matcher,
		);
		if (!tweetNode) return Result.ok();
		components.DeckViewer.checkTweet(tweetNode, tweet);
	}
	return Result.ok();
};

function ActionsCard(props: { tweet: string }) {
	const [showNewDeckModal, setShowNewDeckModal] = useState(false);
	return (
		<>
			<div className="flex flex-row gap-2 p-1 h-20">
				<div
					role="button"
					className="p-2 flex flex-col grow justify-center items-center gap-1 bg-fd-bg-15! hover:shadow-lighten! rounded-xl"
					onClick={() => setShowNewDeckModal(true)}
				>
					<PlusIcon width={24} height={24} />
					<p className="text-sm text-center">Create a new deck</p>
				</div>
				<div
					role="button"
					className="p-2 flex flex-col grow justify-center items-center gap-1 bg-fd-bg-15! hover:shadow-lighten! rounded-xl"
					onClick={async () => {
						components.SelectDeckPopup.hide();
						(
							await Result.gen(async function* () {
								yield* Result.await(unbookmarkTweet(props.tweet));
								yield* Result.await(
									removeTweet(props.tweet, undefined, { markUngrouped: false }),
								);
								return Result.ok();
							})
						).match({
							ok: () =>
								console.log("successfully unbookmarked tweet", props.tweet),
							err: () =>
								console.error("failed to unbookmark tweet", props.tweet),
						});
					}}
				>
					<BookmarkIcon width={24} height={24} />
					<p className="text-sm text-center">Remove from bookmarks</p>
				</div>
			</div>
			{showNewDeckModal &&
				createPortal(
					<CreateDeckModal
						onCreated={async (deck) => {
							const result = await saveTweet(props.tweet, deck);
							if (result.isErr()) {
								console.error(
									"failed to save tweet",
									props.tweet,
									"to newly created deck",
									deck,
									result.error,
								);
							}
						}}
						onClose={() => setShowNewDeckModal(false)}
					/>,
					document.body,
				)}
		</>
	);
}

function DeckCard(props: { deck: DatabaseDeck; tweet: string }) {
	const [state, setState] = useState<DeckCardState>(DeckCardState.IDLE);
	const thumbnails = useLiveQuery(() => getDeckThumbnails(props.deck.id, 1));
	const saveButtonRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		isTweetInSpecificDeck(props.tweet, props.deck.id).then((v) => {
			if (v) setState(DeckCardState.SAVED);
		});

		const deckedListener = (
			ev: CustomEvent<{ tweet: string; deck: string }>,
		) => {
			if (ev.detail.deck === props.deck.id && ev.detail.tweet === props.tweet)
				setState(DeckCardState.SAVED);
		};
		tweetsEventTarget.addEventListener("tweet-decked", deckedListener);
		return () =>
			tweetsEventTarget.removeEventListener("tweet-decked", deckedListener);
	}, [props.tweet]);

	useEffect(() => {
		if (!saveButtonRef.current) return;

		const getButtonText = () => {
			switch (state) {
				case DeckCardState.IDLE:
					return "Save";
				case DeckCardState.SAVING:
					return "Saving";
				case DeckCardState.SAVED:
					return "Saved!";
				case DeckCardState.REMOVING:
					return "Removing";
				case DeckCardState.REMOVED:
					return "Removed!";
				case DeckCardState.ERROR:
					return "Error!";
			}
		};

		saveButtonRef.current.innerText = getButtonText();
		saveButtonRef.current.disabled =
			state === DeckCardState.SAVING || state === DeckCardState.REMOVING;

		if (state === DeckCardState.SAVING) save();
		else if (state === DeckCardState.REMOVING) remove();
	}, [state]);

	const save = useCallback(async () => {
		setState(
			(await saveTweet(props.tweet, props.deck.id)).match({
				ok: () => DeckCardState.SAVED,
				err: (err) => {
					console.error(
						"failed to save tweet",
						props.tweet,
						"to deck",
						props.deck.id,
						err,
					);
					return DeckCardState.ERROR;
				},
			}),
		);
	}, [setState]);

	const remove = useCallback(async () => {
		setState(
			(await removeTweet(props.tweet, props.deck.id)).match({
				ok: () => DeckCardState.REMOVED,
				err: (err) => {
					console.error(
						"failed to remove tweet",
						props.tweet,
						"from deck",
						props.deck.id,
						err,
					);
					return DeckCardState.ERROR;
				},
			}),
		);

		// if we're currently viewing this deck
		if (decksEventTarget.currentDeck === props.deck.id)
			components.SelectDeckPopup.hide();

		if (await isTweetInDeck(props.tweet)) return;
		// if it was previously in the ungrouped "deck", it's supposed to be brought back.
		// although, it needs to be found in the original list, not the DeckTweetList...
		// TODO: move this into a helper function?
		const node = document.querySelector(`div[data-favedeck-id=${props.tweet}]`);
		if (node)
			components.DeckViewer.checkTweet(node as HTMLElement, props.tweet);
	}, [setState]);

	const saveButtonClicked = async () => {
		if (state === DeckCardState.IDLE || state === DeckCardState.REMOVED)
			setState(DeckCardState.SAVING);
		else if (state === DeckCardState.SAVED) setState(DeckCardState.REMOVING);
	};

	return (
		<div
			onClick={saveButtonClicked}
			role="button"
			className="w-full hover:shadow-lighten! focus:shadow-lighten! hover:cursor-pointer p-2 rounded-lg h-20 shrink-0 flex flex-row justify-between items-center gap-4"
		>
			<div className="flex flex-row h-full gap-4 justify-center items-center w-full min-w-0">
				<div className="h-full rounded-lg bg-fd-bg-20! aspect-square relative flex justify-center items-center">
					{props.deck.secret ? (
						<LockIcon width={24} height={24} />
					) : (thumbnails ?? []).length !== 0 ? (
						<img
							src={thumbnails?.[0]}
							alt="deck icon"
							className="h-full rounded-lg aspect-square object-cover"
						/>
					) : undefined}
				</div>

				<div className="flex flex-col grow min-w-0">
					<p className="overflow-hidden text-ellipsis whitespace-nowrap">
						{props.deck.name}
					</p>
					{state === DeckCardState.SAVED && (
						<p className="pointer-events-none opacity-50 text-sm -mt-1">
							Click again to remove
						</p>
					)}
					{state === DeckCardState.REMOVED && (
						<p className="pointer-events-none opacity-50 text-sm -mt-1">
							Click again to save
						</p>
					)}
					{state === DeckCardState.ERROR && (
						<p className="pointer-events-none opacity-50 text-sm -mt-1">
							Check the console
						</p>
					)}
				</div>
			</div>

			<button
				ref={saveButtonRef}
				onClick={saveButtonClicked}
				type="button"
				className="bg-fd-primary! rounded-full hover:shadow-darken! hover:cursor-pointer disabled:shadow-darken! px-4 py-2 font-bold"
			>
				Save
			</button>
		</div>
	);
}

function InternalSelectDeckPopup(props: {
	tweet: string;
	onReady: () => void;
}) {
	const decks = useLiveQuery(getUserDecksAutomatically);

	useEffect(() => {
		if (decks !== undefined) props.onReady();
	}, [decks]);

	return (
		<div
			className="bg-fd-bg p-2 rounded-xl gap-1 flex flex-col w-sm"
			style={{
				boxShadow:
					"rgba(255, 255, 255, 0.2) 0px 0px 15px, rgba(255, 255, 255, 0.15) 0px 0px 3px 1px",
			}}
		>
			<div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
				{(decks ?? []).map((d) => (
					<DeckCard key={d.id} deck={d} tweet={props.tweet} />
				))}
			</div>
			<ActionsCard tweet={props.tweet} />
		</div>
	);
}

export const SelectDeckPopup = (() => {
	let root: Root | undefined;
	let initiatorElement: HTMLElement | undefined;
	let container: HTMLElement | undefined;
	let currentTweet: string | undefined;

	let lastKnownInitiatorRect: DOMRect;
	const layoutCallback = () => {
		if (!initiatorElement || !container) return;
		// if the initiator got removed in the process (e.g. in a masonry cell),
		// use the last available information
		if (initiatorElement.isConnected && initiatorElement.checkVisibility())
			lastKnownInitiatorRect = initiatorElement.getBoundingClientRect();
		const containerRect = container.getBoundingClientRect();
		let top =
			lastKnownInitiatorRect.top +
			lastKnownInitiatorRect.height +
			window.scrollY +
			10;
		// position it above the button if it doesn't fit below
		if (top - window.scrollY + containerRect.height > window.innerHeight) {
			top =
				lastKnownInitiatorRect.top -
				lastKnownInitiatorRect.height -
				containerRect.height +
				window.scrollY +
				10;
		}
		const left =
			lastKnownInitiatorRect.left +
			lastKnownInitiatorRect.width -
			containerRect.width;

		container.style.top = `${top}px`;
		container.style.left = `${left}px`;
	};

	const clickCallback = (ev: PointerEvent) => {
		if (!container || !ev.target || !(ev.target instanceof Node)) return;
		if (!container.contains(ev.target)) hide();
	};

	const hide = () => {
		console.log("hiding SelectDeckPopup");
		document.removeEventListener("resize", layoutCallback);
		document.removeEventListener("scroll", layoutCallback);
		document.removeEventListener("click", clickCallback);
		currentTweet = undefined;
		initiatorElement = undefined;
		if (!root || !container) return;
		root.unmount();
		root = undefined;
		container.remove();
		container = undefined;
	};

	return {
		show(initiator, mode = "tweet") {
			console.log("showing SelectDeckPopup");
			if (initiatorElement && initiatorElement !== initiator) hide();
			switch (mode) {
				case "tweet": {
					const initiatorFiber = bippy.getFiberFromHostInstance(initiator);
					if (!initiatorFiber) {
						console.error(
							"cannot show SelectDeckPopup for initiator (no fiber found)",
							initiator,
						);
						return;
					}
					const tweetFiber = findTweetFiber(initiatorFiber);
					if (!tweetFiber) {
						console.error(
							"cannot show SelectDeckPopup for initiator (no tweet found)",
							initiator,
						);
						return;
					}
					const tweetId = getTweetIdFromFiber(tweetFiber);
					if (tweetId.isErr()) {
						console.error(
							"cannot show SelectDeckPopup for initiator (couldn't get tweet id from fiber)",
							tweetId.error,
						);
						return;
					}
					currentTweet = tweetId.value;
					break;
				}
				case "masonry-cell": {
					const id = initiator.dataset.favedeckTweetId;
					if (!id) {
						console.error(
							"cannot show SelectDeckPopup for masonry cell (no favedeck-tweet-id attribute present)",
							initiator,
						);
						return;
					}
					currentTweet = id;
					break;
				}
			}
			initiatorElement = initiator;

			container = document.createElement("div");
			container.classList.add("favedeck-root");
			container.style.pointerEvents = "auto";
			container.style.opacity = "0";
			container.style.position = "absolute";
			container.style.left = "0";
			container.style.top = "0";
			document.body.append(container);
			document.addEventListener("resize", layoutCallback);
			document.addEventListener("scroll", layoutCallback);
			document.addEventListener("click", clickCallback);
			root = createRoot(container);
			root.render(
				<InternalSelectDeckPopup
					onReady={() => {
						layoutCallback();
						queueMicrotask(() => {
							// biome-ignore lint/style/noNonNullAssertion: it's not going to be hidden on the same frame
							container!.style.opacity = "1";
						});
					}}
					tweet={currentTweet ?? ""}
				/>,
			);
		},
		hide,
		get currentTweet() {
			return currentTweet;
		},
		get initiator() {
			return initiatorElement;
		},
		get visible() {
			return currentTweet !== undefined;
		},
	} satisfies {
		show: (initiator: HTMLElement, mode: "tweet" | "masonry-cell") => void;
		hide: () => void;
		currentTweet?: string;
		initiator?: HTMLElement;
		visible: boolean;
	};
})();
