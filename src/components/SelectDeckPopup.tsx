/** biome-ignore-all lint/a11y/useFocusableInteractive: TODO */
/** biome-ignore-all lint/a11y/useSemanticElements: TODO */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: TODO */

import {
	type Fiber,
	getDisplayName,
	getFiberFromHostInstance,
	getFiberStack,
} from "bippy";
import { useLiveQuery } from "dexie-react-hooks";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
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
	getTweetIdFromFiber,
	getTweetInfoFromElement,
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

function DeckCard(props: { deck: DatabaseDeck }) {
	const [state, setState] = useState<DeckCardState>(DeckCardState.IDLE);
	const thumbnails = useLiveQuery(() => getDeckThumbnails(props.deck.id, 1));
	const currentTweet = useLiveQuery(kv.tweets.currentTweet.get);
	const currentNewDeck = useLiveQuery(kv.decks.newDeck.get);
	const saveButtonRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (!saveButtonRef.current || currentNewDeck !== props.deck.id) return;
		setState(DeckCardState.SAVING);
		kv.decks.newDeck.set(undefined);
	}, [currentNewDeck, saveButtonRef]);

	useEffect(() => {
		if (!currentTweet) return;
		isTweetInSpecificDeck(currentTweet, props.deck.id).then((v) => {
			if (v) setState(DeckCardState.SAVED);
		});
	}, [currentTweet]);

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

	const getTweetId = () => {
		const fiber = components.SelectDeckPopup.getParentTweetFiber();
		if (!fiber) throw new Error("cannot find the parent twitter fiber");
		return getTweetIdFromFiber(fiber);
	};

	const save = useCallback(async () => {
		await addTweetToDeck(props.deck.id, getTweetId());

		// if we saved a tweet from the ungrouped "deck", hide the tweet
		if ((await kv.decks.currentDeck.get())?.id === "ungrouped") {
			const tweetNode = findParentNode(
				// biome-ignore lint/style/noNonNullAssertion: guaranteed(?) to be present
				components.SelectDeckPopup.getBookmarkButton()!,
				matchers.tweetRoot.matcher,
			);
			if (!tweetNode) return;
			tweetNode.style.display = "none";
			components.SelectDeckPopup.hide();
		}

		setState(DeckCardState.SAVED);
	}, [setState]);

	const remove = useCallback(async () => {
		const fiber = components.SelectDeckPopup.getParentTweetFiber();
		if (!fiber) throw new Error("cannot find the parent twitter fiber");
		const id = getTweetIdFromFiber(fiber);
		await db.tweets
			.where({
				id: id,
				user: await getUserId(fiber),
				deck: props.deck.id,
			})
			.delete();
		setState(DeckCardState.REMOVED);

		// if we're currently viewing this deck
		if ((await kv.decks.currentDeck.get())?.id === props.deck.id)
			components.SelectDeckPopup.hide();

		if (await isTweetInDeck(id)) return;

		// if it was previously in the ungrouped "deck", it's supposed to be brought back.
		// although, it needs to be found in the original list, not the DeckTweetList...
		// TODO: move this into a helper function?
		const tweets = Array.from(
			document.querySelectorAll(matchers.tweet.querySelector),
		).map((n) => n as HTMLElement);
		for (const tweet of tweets) {
			const info = getTweetInfoFromElement(tweet);
			if (!info || info.id !== id) continue;
			console.log("showing tweet", id, "again since it became ungrouped");
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
			className="hover:shadow-lighten! focus:shadow-lighten! hover:cursor-pointer p-2 rounded-lg h-20 w-sm flex flex-row justify-between items-center gap-4"
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

function InternalSelectDeckPopup() {
	const decks = useLiveQuery(getUserDecksAutomatically);
	const currentTweet = useLiveQuery(kv.tweets.currentTweet.get);

	return (
		<div
			key={currentTweet}
			className="bg-fd-bg p-2 rounded-xl gap-1 flex flex-col"
			style={{
				boxShadow:
					"rgba(255, 255, 255, 0.2) 0px 0px 15px, rgba(255, 255, 255, 0.15) 0px 0px 3px 1px",
			}}
		>
			{(decks ?? []).map((d) => (
				<DeckCard key={d.id} deck={d} />
			))}
			<NewDeckCard />
		</div>
	);
}

export const SelectDeckPopup = (() => {
	let bookmarkButton: HTMLButtonElement | undefined;
	let container: HTMLDivElement | undefined;
	let visible: boolean = false;

	const hide = (remove = false) => {
		if (remove) {
			(async () => {
				const fiber = getParentTweetFiber();
				if (!fiber) return;
				db.tweets
					.where({
						id: getTweetIdFromFiber(fiber),
						user: await getUserId(fiber),
					})
					.delete();
			})();
		}

		document.removeEventListener("resize", layoutCallback);
		document.removeEventListener("scroll", layoutCallback);
		document.removeEventListener("click", clickCallback);
		if (!container) return;
		container.style.left = "0";
		container.style.top = "0";
		container.style.zIndex = "-1000";
		container.style.opacity = "0";
		container.style.pointerEvents = "none";
		bookmarkButton = undefined;
		visible = false;
	};

	const layoutCallback = () => {
		if (!bookmarkButton || !container) return;
		const rect = bookmarkButton.getBoundingClientRect();
		const popupRect = container.getBoundingClientRect();
		const top = rect.top + rect.height + window.scrollY + 15;
		/* const left =
			rect.left + window.scrollX - popupRect.width / 2 + rect.width / 2; */
		const left = rect.left + rect.width - popupRect.width;

		container.style.top = `${top}px`;
		container.style.left = `${left}px`;
	};

	const getParentTweetFiber = () => {
		const buttonFiber = getFiberFromHostInstance(bookmarkButton);
		if (!buttonFiber) return null;
		const stack = getFiberStack(buttonFiber);
		return stack.filter((f) => getDisplayName(f) === "Tweet").at(0) ?? null;
	};

	const clickCallback = (ev: PointerEvent) => {
		if (
			!bookmarkButton ||
			!container ||
			!ev.target ||
			!(ev.target instanceof Node)
		)
			return;
		if (!container.contains(ev.target)) hide();
	};

	return {
		create() {
			if (document.querySelector("#favedeck-select-deck"))
				window.dispatchEvent(new CustomEvent("remove-fd-select-deck"));

			const div = document.createElement("div");
			div.style.zIndex = "-1000";
			div.style.pointerEvents = "none";
			div.style.opacity = "0";
			div.style.position = "absolute";
			div.style.left = "0";
			div.style.top = "0";
			div.id = "favedeck-select-deck";
			document.body.append(div);
			container = div;

			createRoot(div).render(<InternalSelectDeckPopup />);
		},
		getParentTweetFiber,
		show() {
			if (!container || !bookmarkButton) return;
			container.style.zIndex = "1000";
			container.style.pointerEvents = "auto";
			container.style.opacity = "1";
			document.addEventListener("resize", layoutCallback);
			document.addEventListener("scroll", layoutCallback);
			document.addEventListener("click", clickCallback);
			layoutCallback();
			visible = true;
		},
		hide,
		setBookmarkButton(bb) {
			bookmarkButton = bb;

			// set currentTweet if possible
			try {
				const fiber = getParentTweetFiber();
				if (!fiber) return;
				kv.tweets.currentTweet.set(getTweetIdFromFiber(fiber));
			} catch (ex) {
				console.error(`failed to get current tweet: ${ex}`);
			}
		},
		getVisible: () => visible,
		getBookmarkButton: () => bookmarkButton,
	} satisfies {
		create: () => void;
		setBookmarkButton: (bookmarkButton: HTMLButtonElement) => void;
		getBookmarkButton: () => HTMLButtonElement | undefined;
		show: () => void;
		hide: (remove: boolean) => void;
		getParentTweetFiber: () => Fiber | null;
		getVisible: () => boolean;
	};
})();
