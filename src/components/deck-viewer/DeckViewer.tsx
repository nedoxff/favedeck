// oh boy
/** biome-ignore-all lint/a11y/useSemanticElements: TODO */
/** biome-ignore-all lint/a11y/useFocusableInteractive: TODO */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: TODO */

import { decksEventTarget } from "@/src/features/events/decks";
import { tweetsEventTarget } from "@/src/features/events/tweets";
import {
	getDeck,
	getDeckSize,
	getDeckThumbnails,
	getUserDecksAutomatically,
	isTweetInDeck,
} from "@/src/features/storage/decks";
import { type DatabaseDeck, db } from "@/src/features/storage/definition";
import { waitForSelector } from "@/src/helpers/observer";
import { webpack } from "@/src/internals/webpack";
import clsx from "clsx";
import { useLiveQuery } from "dexie-react-hooks";
import { createPortal } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { tweetComponents } from "../external/Tweet";
import CreateDeckModal from "../modals/CreateDeckModal";
import EditDeckModal from "../modals/EditDeckModal";
import { components } from "../wrapper";
import { DeckMasonryList } from "./DeckTweetList";

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

function NewDeckBoardItem() {
	const [showModal, setShowModal] = useState(false);
	const decksCount = useLiveQuery(() => db.decks.count(), [], 0);

	return (
		<>
			<div
				role="button"
				onClick={() => setShowModal(true)}
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
						<title>plus icon</title>
						<path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z" />
					</svg>
				</div>
				<div className="pointer-events-none">
					<p className="font-bold text-xl">New deck</p>
					<p className="opacity-50">
						{decksCount === 0
							? "we all start somewhere..."
							: `${decksCount} is never enough!`}
					</p>
				</div>
			</div>
			{showModal &&
				createPortal(
					<CreateDeckModal onClose={() => setShowModal(false)} />,
					document.body,
				)}
		</>
	);
}

function UngroupedDeckBoardItem() {
	return (
		<div
			role="button"
			onClick={(ev) => {
				ev.preventDefault();
				decksEventTarget.setCurrentDeck("ungrouped");
				webpack.common.history.push({
					hash: "#fd-ungrouped",
					pathname: "/i/bookmarks",
					state: "from-deck-view",
				});
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
				<p className="opacity-50">the rest of your bookmarks</p>
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
					decksEventTarget.setCurrentDeck(props.deck.id);
					webpack.common.history.push({
						hash: `#fd-${props.deck.id}`,
						pathname: "/i/bookmarks",
						state: "from-deck-view",
					});
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
	const [currentDeck, setCurrentDeck] = useState<string | null>(
		decksEventTarget.currentDeck,
	);
	const currentDatabaseDeck = useLiveQuery(
		() => getDeck(currentDeck ?? ""),
		[currentDeck],
	);

	useEffect(() => {
		currentDeck === "ungrouped"
			? components.DeckViewer.originalContainer.show()
			: components.DeckViewer.originalContainer.hide();
	}, [currentDeck]);

	useEffect(() => {
		const listener = (ev: CustomEvent<string | null>) =>
			setCurrentDeck(ev.detail);
		decksEventTarget.addEventListener("current-deck-changed", listener);
		return () =>
			decksEventTarget.removeEventListener("current-deck-changed", listener);
	}, []);

	const [tweetComponentsAvailable, setTweetComponentsAvailable] =
		useState(false);
	useEffect(() => {
		const listener = () => setTweetComponentsAvailable(true);
		if (tweetComponents.meta.available) setTweetComponentsAvailable(true);
		else tweetsEventTarget.addEventListener("components-available", listener);
		return () =>
			tweetsEventTarget.removeEventListener("components-available", listener);
	}, []);

	return (
		<div className="flex flex-col">
			<div className="h-14 px-4 gap-6 flex flex-row items-center w-full sticky top-0 z-10 bg-fd-bg/75 backdrop-blur-xl">
				<a
					href="/home"
					onClick={(ev) => {
						ev.preventDefault();
						if (currentDeck === null) webpack.common.history.push("/home");
						else {
							setCurrentDeck(null);
							if (
								webpack.common.history._history.location.state ===
								"from-deck-view"
							)
								webpack.common.history.goBack();
							else webpack.common.history.push("/i/bookmarks");
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
					{currentDatabaseDeck ? currentDatabaseDeck.name : "Decks"}
				</p>
			</div>
			<hr className="border-t-2" />
			{currentDeck === null ? (
				<div className="p-4 gap-2 flex flex-row flex-wrap">
					{(userDecks ?? []).map((d) => (
						<DeckBoardItem key={d.id} deck={d} />
					))}
					<UngroupedDeckBoardItem />
					<NewDeckBoardItem />
				</div>
			) : currentDeck !== "ungrouped" ? (
				tweetComponentsAvailable &&
				currentDatabaseDeck && (
					<tweetComponents.ContextBridge>
						<DeckMasonryList deck={currentDatabaseDeck} />
					</tweetComponents.ContextBridge>
				)
			) : undefined}
		</div>
	);
}

export const DeckViewer: {
	create: () => void;
	hide: () => void;
	isMounted: boolean;
	checkUngroupedTweet: (node: HTMLElement, id: string) => void;
	originalContainer: {
		set: (container: HTMLElement) => void;
		show: () => void;
		hide: () => void;
	};
} = (() => {
	let root: Root | undefined;
	let originalContainer: HTMLElement | undefined;
	let container: HTMLElement | undefined;

	return {
		async create() {
			if (components.DeckViewer.isMounted) {
				console.log("unmounting old DeckViewer");
				components.DeckViewer.hide();
			}

			container = await waitForSelector(document.body, "#favedeck-viewer");
			if (!container) {
				console.error("couldn't find favedeck container");
				return;
			}

			console.log("mounting new DeckViewer");
			root = createRoot(container);
			root.render(<DeckBoard />);
		},
		hide() {
			console.log("unmounting DeckViewer");
			root?.unmount();
			root = undefined;
			if (container?.isConnected) container.remove();
			container = undefined;
			decksEventTarget.setCurrentDeck(null);
		},
		get isMounted() {
			return root !== undefined && (container?.isConnected ?? false);
		},
		async checkUngroupedTweet(node, id) {
			if (
				decksEventTarget.currentDeck !== undefined &&
				decksEventTarget.currentDeck !== "ungrouped"
			)
				return;
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
	};
})();
