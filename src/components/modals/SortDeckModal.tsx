import { pointerIntersection } from "@dnd-kit/collision";
import {
	type DragDropEvents,
	DragDropProvider,
	useDraggable,
	useDroppable,
} from "@dnd-kit/react";
import { useLiveQuery } from "dexie-react-hooks";
import React, { type ReactNode } from "react";
import { decksEventTarget } from "@/src/features/events/decks";
import {
	addTweetToDeck,
	getDeckSize,
	getDeckThumbnails,
	getUserDecksAutomatically,
	isTweetInDeck,
} from "@/src/features/storage/decks";
import type { DatabaseDeck } from "@/src/features/storage/definition";
import { cn } from "@/src/helpers/cn";
import { createTweetObserver } from "@/src/helpers/observer";
import {
	getRootNodeFromTweetElement,
	type RootNodeInfo,
} from "@/src/internals/goodies";
import { findParentNode, matchers } from "@/src/internals/matchers";
import { unbookmarkTweet } from "@/src/internals/redux";
import { webpack } from "@/src/internals/webpack";
import ArrowDownIcon from "~icons/mdi/arrow-down";
import ArrowUpIcon from "~icons/mdi/arrow-up";
import BookmarkIcon from "~icons/mdi/bookmark";
import CloseIcon from "~icons/mdi/close";
import LockIcon from "~icons/mdi/lock-outline";
import PlusIcon from "~icons/mdi/plus";
import { IconButton } from "../common/IconButton";
import DeckDropdown from "../dropdown/DeckDropdown";
import { tweetComponents } from "../external/Tweet";
import { TweetWrapper } from "../external/TweetWrapper";
import { components } from "../wrapper";
import CreateDeckModal from "./CreateDeckModal";
import { TwitterModal } from "./TwitterModal";

function DeckItemPreview(props: {
	className: string;
	thumbnail?: string;
	deck: DatabaseDeck;
}) {
	return (
		<div
			className={cn(
				props.className,
				"bg-fd-bg-20 relative flex justify-center items-center",
			)}
		>
			{props.deck.secret ? (
				<LockIcon width={24} height={24} />
			) : props.thumbnail ? (
				<img
					src={props.thumbnail}
					className="absolute w-full h-full! object-cover"
					alt="deck preview"
				/>
			) : undefined}
		</div>
	);
}

function DeckItem(props: { deck: DatabaseDeck }) {
	const { ref, isDropTarget } = useDroppable({
		id: props.deck.id,
		collisionDetector: pointerIntersection,
	});
	const thumbnails = useLiveQuery(() => getDeckThumbnails(props.deck.id, 3));
	const size = useLiveQuery(() => getDeckSize(props.deck.id));

	return (
		<div
			ref={ref}
			className="w-[calc(25%-16px)] h-60 p-2 flex flex-col gap-2 rounded-2xl"
		>
			<div
				className={cn(
					"grow rounded-xl overflow-hidden relative grid grid-cols-4 grid-rows-2 gap-1 transition-all",
					isDropTarget ? "ring-4! ring-fd-primary!" : "ring-0",
				)}
			>
				<DeckItemPreview
					className="col-span-2 row-span-2"
					deck={props.deck}
					thumbnail={(thumbnails ?? []).at(0)}
				/>
				<DeckItemPreview
					className="col-span-2 col-start-3!"
					deck={props.deck}
					thumbnail={(thumbnails ?? []).at(1)}
				/>
				<DeckItemPreview
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
			</div>
		</div>
	);
}

function DraggableTweetCard(props: { id: string; index: number }) {
	const { ref, isDragging } = useDraggable({
		id: props.id,
	});

	return (
		<div
			ref={ref}
			className={cn(
				"w-[25%] absolute top-[65%] transition-all hover:rotate-0 hover:top-[55%] animate-sort-slide-up!",
			)}
			style={{
				left: `${(props.index + 1) * 12.5}%`,
				rotate: isDragging ? "0deg" : `${props.index * 0.8 - 2}deg`,
				animationDelay: `${props.index * 100}ms`,
			}}
		>
			<TweetWrapper
				className="bg-fd-bg w-full overflow-hidden rounded-xl border-2 pointer-events-none"
				patchOptions={{
					isClickable: false,
					shouldDisplayBorder: false,
				}}
				data={{ id: props.id }}
			/>
		</div>
	);
}

function CustomDropCard(props: { id: string; children: ReactNode }) {
	const { isDropTarget, ref } = useDroppable({
		id: props.id,
		collisionDetector: pointerIntersection,
	});

	return (
		<div
			ref={ref}
			className={cn(
				"rounded-xl border-dashed border-2 flex flex-col gap-2 justify-center items-center h-full",
				isDropTarget && "border-fd-primary!",
			)}
		>
			{props.children}
		</div>
	);
}

export default function SortDeckModal(props: { onClose: () => void }) {
	const allowedToRender =
		components.DeckViewer.isMounted &&
		(components.DeckViewer.originalContainer.value?.isConnected ?? false);
	const userDecks = useLiveQuery(getUserDecksAutomatically, [], []);
	const deckContainerRef = useRef<HTMLDivElement>(null);

	const [hiddenTweets, setHiddenTweets] = useState<RootNodeInfo[]>([]);
	const [allTweets, setAllTweets] = useState<RootNodeInfo[]>([]);
	const [sortedTweets, setSortedTweets] = useState<string[]>([]);

	const [pendingNewDeckTweet, setPendingNewDeckTweet] = useState<
		| {
				id: string;
				index: number;
		  }
		| undefined
	>(undefined);

	useEffect(() => {
		if (!allowedToRender) return;

		queueMicrotask(() => {
			const tweets = Array.from(
				(components.DeckViewer.originalContainer.value?.querySelectorAll(
					matchers.tweet.querySelector,
				) ?? []) as HTMLElement[],
			);
			setAllTweets(() =>
				tweets
					.map(getRootNodeFromTweetElement)
					.filter((i) => i !== null)
					.filter((i) => {
						const isDecked = i.rootNode.dataset.favedeckDecked === "yes";
						if (isDecked) {
							i.rootNode.style.display = "none";
							setHiddenTweets((cur) => [...cur, i]);
						}
						return !isDecked;
					}),
			);
		});

		const tweetObserver = createTweetObserver(async (tweet) => {
			const info = getRootNodeFromTweetElement(tweet);
			const isFromWrapper =
				info?.rootNode.parentElement?.classList.contains("fd-tweet-wrapper") ??
				false;
			if (!info || isFromWrapper) return;
			const isDecked = await isTweetInDeck(info.id);
			if (isDecked) {
				info.rootNode.style.display = "none";
				setHiddenTweets((cur) => [...cur, info]);
			} else
				setAllTweets((cur) =>
					cur.some((t) => t.id === info.id) ? cur : [...cur, info],
				);
		});
		return () => tweetObserver.disconnect();
	}, []);

	const handleTweetOpacity = (
		operation: Parameters<DragDropEvents["dragend"]>["0"]["operation"],
	) => {
		const element = operation.source?.element as HTMLElement | undefined;
		if (element)
			element.style.opacity = operation.target === null ? "1" : "0.75";
	};

	const onClose = useCallback(() => {
		for (const tweet of hiddenTweets) tweet.rootNode.style.display = "flex";
		props.onClose();
	}, [hiddenTweets]);

	useEffect(() => {
		if (sortedTweets.length === 5) {
			setAllTweets((cur) => cur.slice(5));
			setSortedTweets([]);
		}
	}, [allTweets, sortedTweets]);

	return (
		<>
			<TwitterModal className="p-0 w-[95%] h-[95%]" onClose={onClose}>
				<div className="flex flex-row gap-4 items-center pt-8 px-8">
					<IconButton onClick={onClose}>
						<CloseIcon width={24} height={24} />
					</IconButton>
					<p className="font-bold text-2xl">Sort bookmarks</p>
				</div>
				<div className="grow relative overflow-hidden px-8">
					<DragDropProvider
						onDragOver={(ev) => {
							handleTweetOpacity(ev.operation);
						}}
						onDragEnd={async (ev) => {
							handleTweetOpacity(ev.operation);
							if (ev.operation.source && ev.operation.target) {
								(ev.operation.source.element as HTMLElement).style.display =
									"none";

								const tweet = ev.operation.source.id.toString();
								const target = ev.operation.target.id.toString();
								const info = allTweets.find((t) => t.id === tweet);
								if (!info) return;

								try {
									switch (target) {
										case "unbookmark": {
											await unbookmarkTweet(tweet);
											break;
										}
										case "new-deck": {
											setPendingNewDeckTweet({
												id: tweet,
												index: allTweets.findIndex((t) => t.id === tweet),
											});
											break;
										}
										default: {
											await addTweetToDeck(target, tweet);
											break;
										}
									}

									const rootNode = document.querySelector(
										`div[data-favedeck-id="${info.id}"]`,
									) as HTMLElement | null;
									if (rootNode) rootNode.style.display = "none";
									setSortedTweets((cur) => [...cur, info.id]);
									setHiddenTweets((cur) => [...cur, info]);
								} catch (err) {
									console.error(`failed to drop ${tweet} into ${target}`, err);
								}
							}
						}}
					>
						<div className="h-[60%] flex flex-row gap-4">
							<div
								className="basis-3/4 overflow-scroll scroll-shadow"
								ref={deckContainerRef}
							>
								<div className="flex flex-row flex-wrap">
									{userDecks.map((ud) => (
										<DeckItem key={ud.id} deck={ud} />
									))}
								</div>
							</div>
							<div className="flex flex-col gap-4 py-2 basis-1/4 *:basis-1/2">
								<CustomDropCard id="unbookmark">
									<BookmarkIcon width={48} height={48} />
									<p className="text-xl">Unbookmark tweet</p>
								</CustomDropCard>
								<CustomDropCard id="new-deck">
									<PlusIcon width={48} height={48} />
									<p className="text-xl">New deck</p>
								</CustomDropCard>
							</div>
						</div>
						<tweetComponents.ContextBridge>
							{allTweets
								.slice(0, 5)
								.map(
									({ id }, idx) =>
										!sortedTweets.includes(id) && (
											<DraggableTweetCard id={id} key={id} index={idx} />
										),
								)}
						</tweetComponents.ContextBridge>
					</DragDropProvider>
				</div>
			</TwitterModal>
			{pendingNewDeckTweet && (
				<CreateDeckModal
					onClose={(cancelled) => {
						if (cancelled) {
							setSortedTweets((cur) =>
								cur.filter((t) => t !== pendingNewDeckTweet.id),
							);
							const info = allTweets.find(
								(t) => t.id === pendingNewDeckTweet.id,
							);
							if (info) info.rootNode.style.display = "flex";
						}
						setPendingNewDeckTweet(undefined);
					}}
					onCreated={(id) => addTweetToDeck(id, pendingNewDeckTweet.id)}
				/>
			)}
		</>
	);
}
