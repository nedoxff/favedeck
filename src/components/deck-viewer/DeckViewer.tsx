// oh boy
/** biome-ignore-all lint/a11y/useSemanticElements: TODO */
/** biome-ignore-all lint/a11y/useFocusableInteractive: TODO */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: TODO */

import {
	getDeckSize,
	getDeckThumbnails,
	getDeckTweets,
	getUserDecksAutomatically,
	isTweetInDeck,
	UNGROUPED_DECK,
} from "@/src/features/storage/decks";
import {
	type DatabaseDeck,
	type DatabaseTweet,
	db,
} from "@/src/features/storage/definition";
import { decks } from "@/src/features/storage/kv";
import { waitForSelector } from "@/src/helpers/observer";
import { addEntitiesFromDatabaseTweets } from "@/src/internals/redux";
import { webpack } from "@/src/internals/webpack";
import clsx from "clsx";
import Dexie from "dexie";
import { useLiveQuery } from "dexie-react-hooks";
import { mergician } from "mergician";
import React from "react";
import { createPortal } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { tweetComponents } from "../external/Tweet";
import { TwitterModal } from "../TwitterModal";

const patchTweetProps = (
	tweet: DatabaseTweet,
	props: Record<string, unknown>,
) => {
	const copy = mergician({}, props);
	// @ts-expect-error
	// NOTE: THE "-modified" HERE IS REALLY IMPORTANT
	copy.item.id = `tweet-${tweet.id}-modified`;
	// @ts-expect-error
	copy.item.data.entryId = `tweet-${tweet.id}`;
	// @ts-expect-error
	copy.item.data.content.id = tweet.id;
	// @ts-expect-error
	copy.item.render = () => copy.item._renderer(copy.item.data, undefined);
	// @ts-expect-error
	copy.item.data.content.displayType = "Tweet";
	// @ts-expect-error
	copy.item.data.conversationPosition = undefined;
	// @ts-expect-error
	copy.visible = true;
	// @ts-expect-error
	copy.shouldAnimate = false;
	return copy;
};

function DeckTweetList(props: { deck: DatabaseDeck }) {
	const [tweetComponentsAvailable, setTweetComponentsAvailable] = useState(
		tweetComponents.meta.available,
	);
	const tweets = useLiveQuery(() => getDeckTweets(props.deck.id));
	const ref = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (!tweetComponentsAvailable) {
			tweetComponents.meta = new Proxy(tweetComponents.meta, {
				set(target, p, newValue, _receiver) {
					if (p === "available") setTweetComponentsAvailable(newValue);
					// @ts-expect-error
					target[p] = newValue;
					return true;
				},
			});
			return;
		}
		if (!ref.current || !tweets || tweets.length === 0) return;

		(async () => {
			await addEntitiesFromDatabaseTweets(tweets ?? []);

			queueMicrotask(() => {
				if (!ref.current) return;
				const TwitterReact = webpack.common.react.React;
				const TwitterReactDOM = webpack.common.react.ReactDOM;
				const root = TwitterReactDOM.createRoot(ref.current);

				const tweetsContainer = TwitterReact.createElement(React.Fragment, {
					children: tweets.map((t) =>
						TwitterReact.createElement(tweetComponents.Tweet, {
							...patchTweetProps(t, tweetComponents.meta.defaultTweetProps),
						}),
					),
				});

				const bridge = TwitterReact.createElement(
					tweetComponents.ContextBridge,
					{
						children: tweetsContainer,
					},
				);
				root.render(TwitterReact.createElement(() => bridge));
			});
		})();
	}, [tweetComponentsAvailable, ref.current, tweets]);

	return <div ref={ref} className="*:static!" />;
}

function DeckBoardItemPreview(props: {
	className: string;
	thumbnail?: string;
	deck: DatabaseDeck;
}) {
	return (
		<div
			className={clsx(
				props.className,
				"bg-fd-bg-even-lighter relative flex justify-center items-center",
			)}
		>
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
			) : props.thumbnail ? (
				<img
					src={props.thumbnail}
					className="absolute w-full h-full object-cover"
					alt="deck preview"
				/>
			) : undefined}
		</div>
	);
}

function EditDeckModal(props: { deck: DatabaseDeck; onClose: () => void }) {
	const [deckName, setDeckName] = useState(props.deck.name);
	const [deckSecret, setDeckSecret] = useState(props.deck.secret);
	const [deleteClicked, setDeleteClicked] = useState(false);

	return (
		<TwitterModal onClose={props.onClose}>
			<p className="font-bold text-2xl">Edit deck</p>
			<p className="opacity-75">Name:</p>
			<input
				className={`caret-fd-primary! py-2 px-4 placeholder:opacity-50! rounded-full w-full border-2 hover:border-fd-primary!`}
				placeholder="Enter deck name..."
				type="text"
				value={deckName}
				onInput={(ev) => setDeckName((ev.target as HTMLInputElement).value)}
			/>
			<div>
				<input
					id="favedeck-edit-deck-popup-secret"
					className="accent-fd-primary"
					type="checkbox"
					checked={deckSecret}
					onChange={(ev) => setDeckSecret(ev.target.checked)}
				/>
				<label className="ml-2" htmlFor="favedeck-edit-deck-popup-secret">
					Secret (hide thumbnails)
				</label>
			</div>
			<button
				onClick={async () => {
					await db.decks.update(props.deck.id, {
						name: deckName,
						secret: deckSecret,
					});
					props.onClose();
				}}
				disabled={deckName.length === 0}
				type="button"
				className="rounded-full w-full text-white font-bold bg-fd-primary! disabled:shadow-darken! hover:shadow-darken! py-2 px-4 text-center"
			>
				Save
			</button>
			<button
				onClick={async () => {
					if (!deleteClicked) {
						setDeleteClicked(true);
						return;
					}
					await db.decks.delete(props.deck.id);
					props.onClose();
				}}
				type="button"
				className="rounded-full w-full text-white font-bold bg-fd-danger! hover:shadow-lighten! py-2 px-4 text-center"
			>
				{deleteClicked ? "Are you sure?" : "Delete"}
			</button>
			<button
				onClick={props.onClose}
				type="button"
				className="rounded-full w-full text-white font-bold bg-fd-bg-lighter! hover:shadow-lighten! py-2 px-4 text-center"
			>
				Cancel
			</button>
		</TwitterModal>
	);
}

function UngroupedDeckBoardItem() {
	return (
		<div
			role="button"
			onClick={(ev) => {
				ev.preventDefault();
				decks.currentDeck.set(UNGROUPED_DECK);
				window.history.pushState("from-deck-view", "", `#fd-ungrouped`);
			}}
			className="grow shrink basis-[45%] max-w-[calc(50%-8px)] h-60 hover:cursor-pointer group w-full flex flex-col gap-2 p-2 hover:shadow-lighten! rounded-2xl"
		>
			<div className="grow rounded-xl overflow-hidden relative border-dashed border-2 border-white! flex justify-center items-center opacity-50">
				<svg
					className="scale-200!"
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
				>
					<path
						fill="currentColor"
						d="M6 14q-.825 0-1.412-.587T4 12t.588-1.412T6 10t1.413.588T8 12t-.587 1.413T6 14m6 0q-.825 0-1.412-.587T10 12t.588-1.412T12 10t1.413.588T14 12t-.587 1.413T12 14m6 0q-.825 0-1.412-.587T16 12t.588-1.412T18 10t1.413.588T20 12t-.587 1.413T18 14"
					/>
					<title>more icon</title>
				</svg>
			</div>
			<div className="pointer-events-none">
				<p className="font-bold text-xl">Ungrouped</p>
				<p className="opacity-50">? tweets</p>
			</div>
		</div>
	);
}

function DeckBoardItem(props: { deck: DatabaseDeck }) {
	const thumbnails = useLiveQuery(() => getDeckThumbnails(props.deck.id, 3));
	const size = useLiveQuery(() => getDeckSize(props.deck.id));
	const [showEditModal, setShowEditModal] = useState(false);

	return (
		<>
			<div
				role="button"
				onClick={(ev) => {
					ev.preventDefault();
					decks.currentDeck.set(props.deck);
					window.history.pushState(
						"from-deck-view",
						"",
						`#fd-${props.deck.id}`,
					);
				}}
				className="grow shrink basis-[45%] max-w-[calc(50%-8px)] h-60 hover:cursor-pointer group w-full flex flex-col gap-2 p-2 hover:shadow-lighten! rounded-2xl"
			>
				<div className="grow rounded-xl overflow-hidden relative grid grid-cols-4 grid-rows-2 gap-1">
					<DeckBoardItemPreview
						className="col-span-2 row-span-2"
						deck={props.deck}
						thumbnail={(thumbnails ?? []).at(0)}
					/>
					<DeckBoardItemPreview
						className="col-span-2 col-start-3!"
						deck={props.deck}
						thumbnail={(thumbnails ?? []).at(1)}
					/>
					<DeckBoardItemPreview
						className="col-span-2 col-start-3! row-start-2"
						deck={props.deck}
						thumbnail={(thumbnails ?? []).at(2)}
					/>
				</div>
				<div className="flex flex-row justify-between items-center">
					<div className="pointer-events-none">
						<p className="font-bold text-xl">{props.deck.name}</p>
						<p className="opacity-50">
							{size} {size === 1 ? "tweet" : "tweets"}
						</p>
					</div>
					<button
						type="button"
						className="rounded-full aspect-square justify-center items-center p-2 h-fit hidden group-hover:flex! hover:shadow-lighten!"
						onClick={(ev) => {
							ev.stopPropagation();
							setShowEditModal(true);
						}}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							viewBox="0 0 24 24"
						>
							<path
								fill="currentColor"
								d="M20.71 7.04c.39-.39.39-1.04 0-1.41l-2.34-2.34c-.37-.39-1.02-.39-1.41 0l-1.84 1.83l3.75 3.75M3 17.25V21h3.75L17.81 9.93l-3.75-3.75z"
							/>
							<title>edit icon</title>
						</svg>
					</button>
				</div>
			</div>

			{showEditModal &&
				createPortal(
					<EditDeckModal
						deck={props.deck}
						onClose={() => setShowEditModal(false)}
					/>,
					document.body,
				)}
		</>
	);
}

function DeckBoard() {
	const userDecks = useLiveQuery(getUserDecksAutomatically);
	const currentDeck = useLiveQuery(decks.currentDeck.get);

	useEffect(() => {
		if (currentDeck?.id === "ungrouped") DeckViewer.originalContainer.show();
		else DeckViewer.originalContainer.hide();
	}, [currentDeck]);

	return (
		<div className="flex flex-col">
			<div className="h-14 px-4 gap-6 flex flex-row items-center w-full sticky top-0 z-10 bg-fd-bg/75 backdrop-blur-xl">
				<a
					href="/home"
					onClick={(ev) => {
						ev.preventDefault();
						if (currentDeck === undefined) webpack.common.history.push("/home");
						else {
							decks.currentDeck.set(undefined);
							if (window.history.state === "from-deck-view")
								window.history.back();
							else window.history.pushState(null, "", "/i/bookmarks");
						}
					}}
				>
					<div className="rounded-full hover:shadow-lighten! p-2">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="24px"
							height="24px"
							viewBox="0 0 512 512"
						>
							<title>back arrow icon</title>
							<path
								fill="none"
								stroke="currentColor"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="48"
								d="M244 400L100 256l144-144M120 256h292"
							/>
						</svg>
					</div>
				</a>
				<p className="font-bold text-2xl">
					{currentDeck ? currentDeck.name : "Decks"}
				</p>
			</div>
			<hr className="border-t-2" />
			{currentDeck === undefined ? (
				<div className="p-4 gap-2 flex flex-row flex-wrap">
					{(userDecks ?? []).map((d) => (
						<DeckBoardItem key={d.id} deck={d} />
					))}
					<UngroupedDeckBoardItem />
				</div>
			) : currentDeck.id !== "ungrouped" ? (
				<DeckTweetList deck={currentDeck} />
			) : undefined}
		</div>
	);
}

export const DeckViewer = (() => {
	let root: Root | undefined;
	let originalContainer: HTMLElement | undefined;
	let currentDeck: DatabaseDeck | undefined;

	Dexie.liveQuery(decks.currentDeck.get).subscribe({
		next: (v) => {
			currentDeck = v;
		},
		error: console.error,
	});

	return {
		async create() {
			await decks.currentDeck.set(undefined);
			if (root) {
				console.log("unmounting old DeckViewer");
				root.unmount();
				root = undefined;
			}

			const container = await waitForSelector(
				document.body,
				"#favedeck-viewer",
			);
			if (!container) {
				console.error("couldn't find favedeck container");
				return;
			}

			console.log("mounting new DeckViewer");
			root = createRoot(container);
			root.render(<DeckBoard />);

			if (window.location.hash.includes("fd")) {
				const id = window.location.hash.substring(4);
				await decks.currentDeck.set(
					id === "ungrouped" ? UNGROUPED_DECK : await db.decks.get(id),
				);
			}
		},
		hide() {
			console.log("unmounting DeckViewer");
			root?.unmount();
			root = undefined;
		},
		isMounted() {
			return root !== undefined;
		},
		async checkUngroupedTweet(node, id) {
			if (currentDeck !== undefined && currentDeck.id !== "ungrouped") return;
			if (await isTweetInDeck(id)) {
				console.log("removing tweet", id, "since it's present in a deck");
				node.style.display = "none";
			}
		},
		originalContainer: {
			show() {
				if (!originalContainer) return;
				originalContainer.style.position = "";
				originalContainer.style.pointerEvents = "auto";
				originalContainer.style.zIndex = "0";
				originalContainer.style.maxHeight = "";
				originalContainer.style.overflowY = "";
				queueMicrotask(() => {
					if (originalContainer) originalContainer.style.opacity = "1";
				});
			},
			hide() {
				if (!originalContainer) return;
				originalContainer.style.position = "absolute";
				originalContainer.style.width = "100%";
				(originalContainer.childNodes[0] as HTMLElement).style.display = "none";
				originalContainer.style.pointerEvents = "none";
				originalContainer.style.opacity = "0";
				originalContainer.style.zIndex = "-1000";
				originalContainer.style.maxHeight = "100vh";
				originalContainer.style.overflowY = "hidden";
			},
			set(container) {
				originalContainer = container;
				this.hide();
			},
		},
	} satisfies {
		create: () => void;
		hide: () => void;
		isMounted: () => void;
		checkUngroupedTweet: (node: HTMLElement, id: string) => void;
		originalContainer: {
			set: (container: HTMLElement) => void;
			show: () => void;
			hide: () => void;
		};
	};
})();
