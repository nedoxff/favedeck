/** biome-ignore-all lint/a11y/useFocusableInteractive: TODO */
/** biome-ignore-all lint/a11y/useSemanticElements: TODO */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: TODO */

import * as bippy from "bippy";
import { useLiveQuery } from "dexie-react-hooks";
import { createPortal } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { decksEventTarget } from "../features/events/decks";
import {
	addTweetToDeck,
	getDeckThumbnails,
	getUserDecksAutomatically,
	isTweetInDeck,
	isTweetInSpecificDeck,
} from "../features/storage/decks";
import { type DatabaseDeck, db } from "../features/storage/definition";
import { kv } from "../features/storage/kv";
import { getUserId } from "../internals/foolproof";
import {
	findTweetFiber,
	getRootNodeFromTweetElement,
	getTweetIdFromFiber,
} from "../internals/goodies";
import { findParentNode, matchers } from "../internals/matchers";
import CreateDeckModal from "./modals/CreateDeckModal";
import { components } from "./wrapper";

enum DeckCardState {
	IDLE,
	SAVING,
	SAVED,
	REMOVING,
	REMOVED,
}

function NewDeckCard() {
	const [showModal, setShowModal] = useState(false);

	return (
		<div
			onClick={() => {
				if (!showModal) setShowModal(true);
			}}
			role="button"
			className="hover:shadow-lighten! focus:shadow-lighten! hover:cursor-pointer p-2 rounded-lg h-20 w-sm flex flex-row justify-between items-center gap-4"
		>
			<div className="flex flex-row h-full gap-4 justify-center items-center">
				<div className="rounded-lg h-full aspect-square border-dashed border-2 border-white! flex justify-center items-center">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
					>
						<title>plus icon</title>
						<path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z" />
					</svg>
				</div>
				<p>Create a new deck</p>
			</div>
			{showModal &&
				createPortal(
					<CreateDeckModal onClose={() => setShowModal(false)} />,
					document.body,
				)}
		</div>
	);
}

function DeckCard(props: { deck: DatabaseDeck; tweet: string }) {
	const [state, setState] = useState<DeckCardState>(DeckCardState.IDLE);
	const thumbnails = useLiveQuery(() => getDeckThumbnails(props.deck.id, 1));
	const saveButtonRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		const listener = (ev: CustomEvent<DatabaseDeck>) => {
			if (ev.detail.id === props.deck.id) setState(DeckCardState.SAVING);
		};
		if (decksEventTarget.latestCreatedDeck?.id === props.deck.id)
			setState(DeckCardState.SAVING);
		else decksEventTarget.addEventListener("deck-created", listener);
		return () => decksEventTarget.removeEventListener("deck-created", listener);
	}, []);

	useEffect(() => {
		isTweetInSpecificDeck(props.tweet, props.deck.id).then((v) => {
			if (v) setState(DeckCardState.SAVED);
		});
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
			}
		};

		saveButtonRef.current.innerText = getButtonText();
		saveButtonRef.current.disabled =
			state === DeckCardState.SAVING || state === DeckCardState.REMOVING;

		if (state === DeckCardState.SAVING) save();
		else if (state === DeckCardState.REMOVING) remove();
	}, [state]);

	const save = useCallback(async () => {
		await addTweetToDeck(props.deck.id, props.tweet);

		// if we saved a tweet from the ungrouped "deck", hide the tweet
		if (
			(await kv.decks.currentDeck.get())?.id === "ungrouped" &&
			components.SelectDeckPopup.initiator
		) {
			const tweetNode = findParentNode(
				components.SelectDeckPopup.initiator,
				matchers.tweetRoot.matcher,
			);
			if (!tweetNode) return;
			tweetNode.style.display = "none";
			components.SelectDeckPopup.hide();
		}

		setState(DeckCardState.SAVED);
	}, [setState]);

	const remove = useCallback(async () => {
		await db.tweets
			.where({
				id: props.tweet,
				user: await getUserId(),
				deck: props.deck.id,
			})
			.delete();
		setState(DeckCardState.REMOVED);

		// if we're currently viewing this deck
		if ((await kv.decks.currentDeck.get())?.id === props.deck.id)
			components.SelectDeckPopup.hide();

		if (await isTweetInDeck(props.tweet)) return;

		// if it was previously in the ungrouped "deck", it's supposed to be brought back.
		// although, it needs to be found in the original list, not the DeckTweetList...
		// TODO: move this into a helper function?
		const tweets = Array.from(
			document.querySelectorAll(matchers.tweet.querySelector),
		).map((n) => n as HTMLElement);
		for (const tweet of tweets) {
			const info = getRootNodeFromTweetElement(tweet);
			if (!info || info.id !== props.tweet) continue;
			console.log(
				"showing tweet",
				props.tweet,
				"again since it became ungrouped",
			);
			info.rootNode.style.display = "flex";
		}
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
			className="hover:shadow-lighten! focus:shadow-lighten! hover:cursor-pointer p-2 rounded-lg h-20 shrink-0 w-sm flex flex-row justify-between items-center gap-4"
		>
			<div className="flex flex-row h-full gap-4 justify-center items-center">
				<div className="h-full rounded-lg bg-fd-bg-even-lighter! aspect-square relative flex justify-center items-center">
					{props.deck.secret ? (
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							viewBox="0 0 24 24"
						>
							<path
								fill="currentColor"
								d="M6 22q-.825 0-1.412-.587T4 20V10q0-.825.588-1.412T6 8h1V6q0-2.075 1.463-3.537T12 1t3.538 1.463T17 6v2h1q.825 0 1.413.588T20 10v10q0 .825-.587 1.413T18 22zm0-2h12V10H6zm6-3q.825 0 1.413-.587T14 15t-.587-1.412T12 13t-1.412.588T10 15t.588 1.413T12 17M9 8h6V6q0-1.25-.875-2.125T12 3t-2.125.875T9 6zM6 20V10z"
							/>
							<title>lock icon</title>
						</svg>
					) : (thumbnails ?? []).length !== 0 ? (
						<img
							src={thumbnails?.[0]}
							alt="deck icon"
							className="h-full rounded-lg aspect-square object-cover"
						/>
					) : undefined}
				</div>

				<div className="flex flex-col">
					<p>{props.deck.name}</p>
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
			className="bg-fd-bg p-2 rounded-xl gap-1 flex flex-col"
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
			<NewDeckCard />
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
		if (initiatorElement.isConnected)
			lastKnownInitiatorRect = initiatorElement.getBoundingClientRect();
		const containerRect = container.getBoundingClientRect();
		const top =
			lastKnownInitiatorRect.top +
			lastKnownInitiatorRect.height +
			window.scrollY +
			15;
		/* const left =
			rect.left + window.scrollX - popupRect.width / 2 + rect.width / 2; */
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
					currentTweet = getTweetIdFromFiber(tweetFiber);
					break;
				}
				case "masonry-cell": {
					const id = initiator.getAttribute("favedeck-tweet-id");
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
			container.style.zIndex = "1000";
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
