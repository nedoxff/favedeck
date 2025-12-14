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
import { ErrorBoundary } from "react-error-boundary";
import { v6 } from "uuid";
import { type DatabaseDeck, db } from "../features/storage/definition";
import { decks, tweets } from "../features/storage/kv";
import { compressObject } from "../helpers/compression";
import { getUserId } from "../internals/foolproof";
import { getTweetEntity, getUserEntity } from "../internals/redux";
import type { RawTweet } from "../types/tweet";

enum DeckCardState {
	IDLE,
	SAVING,
	SAVED,
	REMOVING,
	REMOVED,
}

const getTweetIdFromFiber = (fiber: Fiber): string => {
	const tweet: RawTweet = fiber.memoizedProps?.tweet as RawTweet;
	if (!tweet)
		throw new Error(
			"the tweet fiber (somehow) doesn't have the tweet in memoizedProps",
		);
	return tweet.id_str;
};

function NewDeckCard() {
	const [showModal, setShowModal] = useState(false);
	const contentRef = useRef<HTMLDivElement>(null);
	const [deckName, setDeckName] = useState("");

	useEffect(() => {
		if (showModal) setDeckName("");
	}, [showModal]);

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
					<div
						role="button"
						className="fixed top-0 bg-fd-mask left-0 w-screen h-screen pointer-events-auto flex flex-col justify-center items-center z-2000"
						onClick={(ev) => {
							ev.stopPropagation();
							if (
								ev.target instanceof Node &&
								!contentRef.current?.contains(ev.target)
							)
								setShowModal(false);
						}}
					>
						<div
							className="p-8 flex flex-col gap-2 rounded-xl bg-fd-bg"
							ref={contentRef}
						>
							<p className="font-bold text-xl">New deck</p>
							<p className="opacity-75">Enter the name for your new deck:</p>
							<input
								className={`caret-fd-primary! py-2 px-4 placeholder:opacity-50! rounded-full w-full border-2 hover:border-fd-primary!`}
								placeholder="Enter deck name..."
								type="text"
								onInput={(ev) =>
									setDeckName((ev.target as HTMLInputElement).value)
								}
							/>
							<button
								onClick={async () => {
									setShowModal(false);
									const id = v6();
									await db.decks.put({
										name: deckName,
										user: (await getUserId()) ?? "",
										id,
									});
									await decks.newDeck.set(id);
								}}
								disabled={deckName.length === 0}
								type="button"
								className="rounded-full w-full text-white font-bold bg-fd-primary! disabled:shadow-darken! hover:shadow-darken! py-2 px-4 text-center"
							>
								Create
							</button>
							<button
								onClick={() => setShowModal(false)}
								type="button"
								className="rounded-full w-full text-white font-bold bg-fd-bg-lighter! hover:shadow-lighten! py-2 px-4 text-center"
							>
								Cancel
							</button>
						</div>
					</div>,
					document.body,
				)}
		</div>
	);
}

function DeckCard(props: { deck: DatabaseDeck }) {
	const [state, setState] = useState<DeckCardState>(DeckCardState.IDLE);
	const currentNewDeck = useLiveQuery(decks.newDeck.get);
	const saveButtonRef = useRef<HTMLButtonElement>(null);
	const iconRef = useRef<HTMLImageElement>(null);

	useEffect(() => {
		fetch("https://dummyimage.com/200").then(async (r) => {
			const blob = await r.blob();
			const url = URL.createObjectURL(blob);
			if (iconRef.current) iconRef.current.src = url;
		});
	}, []);

	useEffect(() => {
		if (!saveButtonRef.current || currentNewDeck !== props.deck.id) return;
		setState(DeckCardState.SAVING);
		decks.newDeck.set(undefined);
	}, [currentNewDeck, saveButtonRef]);

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
		const fiber = SelectDeckPopupRenderer.getParentTweetFiber();
		if (!fiber) throw new Error("cannot find the parent twitter fiber");
		const id = getTweetIdFromFiber(fiber);
		const tweet = getTweetEntity(id);
		const user = getUserEntity(tweet.user);
		db.tweets.put({
			data: await compressObject({ tweet, user }),
			deck: props.deck.id,
			id: id,
			user: (await getUserId(fiber)) ?? "",
		});
		setState(DeckCardState.SAVED);
	}, [setState]);

	const remove = useCallback(async () => {
		const fiber = SelectDeckPopupRenderer.getParentTweetFiber();
		if (!fiber) throw new Error("cannot find the parent twitter fiber");
		const id = getTweetIdFromFiber(fiber);
		db.tweets
			.where({
				id: id,
				user: await getUserId(fiber),
				deck: props.deck.id,
			})
			.delete();
		setState(DeckCardState.REMOVED);
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
				<img alt="deck icon" className="h-full rounded-lg" ref={iconRef} />
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

export function SelectDeckPopup() {
	const decks = useLiveQuery(() => db.decks.toArray());
	const currentTweet = useLiveQuery(tweets.currentTweet.get);

	return (
		<ErrorBoundary
			fallbackRender={(props) => {
				alert(props.error);
				return <div>{props.error}</div>;
			}}
		>
			<div
				key={currentTweet}
				className="bg-fd-bg p-2 rounded-xl gap-1 flex flex-col"
				style={{
					boxShadow:
						"rgba(255, 255, 255, 0.2) 0px 0px 15px, rgba(255, 255, 255, 0.15) 0px 0px 3px 1px",
				}}
			>
				{(decks ?? []).map((d, idx) => (
					<DeckCard key={d.id} deck={d} />
				))}
				<NewDeckCard />
			</div>
		</ErrorBoundary>
	);
}

export const SelectDeckPopupRenderer = (() => {
	let bookmarkButton: HTMLButtonElement | undefined;
	let container: HTMLDivElement | undefined;

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

			createRoot(div).render(<SelectDeckPopup />);
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
		},
		hide,
		setBookmarkButton(bb) {
			bookmarkButton = bb;

			// set currentTweet if possible
			try {
				const fiber = getParentTweetFiber();
				if (!fiber) return;
				tweets.currentTweet.set(getTweetIdFromFiber(fiber));
			} catch (ex) {
				console.error(`failed to get current tweet: ${ex}`);
			}
		},
	} satisfies {
		create: () => void;
		setBookmarkButton: (bookmarkButton: HTMLButtonElement) => void;
		show: () => void;
		hide: (remove: boolean) => void;
		getParentTweetFiber: () => Fiber | null;
	};
})();
