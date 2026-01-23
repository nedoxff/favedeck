import { pointerIntersection } from "@dnd-kit/collision";
import {
	type DragDropEvents,
	DragDropProvider,
	useDraggable,
	useDroppable,
} from "@dnd-kit/react";
import { useLiveQuery } from "dexie-react-hooks";
import { memo, type ReactNode } from "react";
import { internalsEventTarget } from "@/src/features/events/internals";
import {
	getDeckSize,
	getDeckThumbnails,
	getUserDecksAutomatically,
} from "@/src/features/storage/decks";
import type { DatabaseDeck } from "@/src/features/storage/definition";
import { kv } from "@/src/features/storage/kv";
import { getPotentiallyUngroupedTweets } from "@/src/features/storage/potentially-ungrouped";
import {
	addTweetToDeck,
	getLatestSortedTweet,
	splitTweets,
} from "@/src/features/storage/tweets";
import { cn } from "@/src/helpers/cn";
import {
	addEntities,
	fetchBookmarksTimelineFromCursor,
	getBookmarksTimelineEntries,
	getBottomBookmarksTimelineCursor,
	unbookmarkTweet,
} from "@/src/internals/redux";
import BookmarkIcon from "~icons/mdi/bookmark";
import CloseIcon from "~icons/mdi/close";
import LockIcon from "~icons/mdi/lock-outline";
import PlusIcon from "~icons/mdi/plus";
import { IconButton } from "../common/IconButton";
import Spinner from "../common/Spinner";
import { tweetComponents } from "../external/Tweet";
import { TweetWrapper } from "../external/TweetWrapper";
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

const InternalDeckItem = memo(function InternalDeckItem(props: {
	deck: DatabaseDeck;
}) {
	const thumbnails = useLiveQuery(() => getDeckThumbnails(props.deck.id, 3));
	const size = useLiveQuery(() => getDeckSize(props.deck.id));
	return (
		<>
			<div className="grow rounded-xl overflow-hidden relative grid grid-cols-4 grid-rows-2 gap-1 transition-all">
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
		</>
	);
});

function DeckItem(props: { deck: DatabaseDeck }) {
	const { ref, isDropTarget } = useDroppable({
		id: props.deck.id,
		collisionDetector: pointerIntersection,
	});

	return (
		<div
			ref={ref}
			className={cn(
				"w-[calc(25%-16px)] h-60 p-2 flex flex-col gap-2 rounded-2xl",
				isDropTarget ? "*:first:ring-4! *:first:ring-fd-primary!" : "",
			)}
		>
			<InternalDeckItem deck={props.deck} />
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
				id={props.id}
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

export default function SortBookmarksModal(props: { onClose: () => void }) {
	const userDecks = useLiveQuery(getUserDecksAutomatically, [], []);
	const deckContainerRef = useRef<HTMLDivElement>(null);

	const [hiddenTweets, setHiddenTweets] = useState<string[]>([]);
	const [allTweets, setAllTweets] = useState<string[]>([]);
	const [sortedTweets, setSortedTweets] = useState<string[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const [sortedCount, setSortedCount] = useState(0);

	const closingRef = useRef(false);
	const stateCursorUsedRef = useRef(false);
	const [pendingNewDeckTweet, setPendingNewDeckTweet] = useState<
		| {
				id: string;
				index: number;
		  }
		| undefined
	>(undefined);

	const refetchTweetEntries = async () => {
		setIsLoading(true);
		console.log(getBookmarksTimelineEntries());
		const rawEntries = getBookmarksTimelineEntries().filter(
			(entry) => entry.type === "tweet",
		);
		const [unsortedEntries, sortedEntries] = await splitTweets(rawEntries);
		const state = await kv.sortBookmarksState.get();

		// while i'm not asleep...
		// the "cursor" is the last api call where the user stopped sorting bookmarks.
		// however, after closing the dialog and opening it again they might have bookmarked
		// more stuff, or unbookmarked something IN THE MIDDLE of sorted tweets, or even after the cursor. so:

		// - we already skipped to the cursor => fetch from bottom
		// - we started from the top and haven't reached "the latest sorted tweet" (state.latestSortedTweet) => fetch from bottom
		// - we already fetched so far that state.latestSortedTweet is included in the list => fetch from cursor, as
		// the stuff between the state.latestSortedTweet and the cursor is guaranteed to either be completely unbookmarked (we don't care),
		// ungrouped (would end up in db.potentiallyUngrouped and get caught) or grouped (we don't need it)
		if (unsortedEntries.length === 0) {
			const shouldUseCursor =
				state &&
				(rawEntries.at(-1)?.sortIndex ?? "") <=
					state.latestSortedTweet.sortIndex;
			if (
				shouldUseCursor &&
				state.previousCursor &&
				!stateCursorUsedRef.current
			) {
				console.log(
					"no unsorted entries, using last recorded cursor",
					state.previousCursor,
				);
				stateCursorUsedRef.current = true;
				await fetchBookmarksTimelineFromCursor(state.previousCursor);
			} else {
				const bottomCursor = getBottomBookmarksTimelineCursor();
				console.log("no unsorted entries, fetching from bottom", bottomCursor);
				if (bottomCursor) await fetchBookmarksTimelineFromCursor(bottomCursor);
			}
			return;
		}

		setAllTweets((current) => {
			const newEntries = unsortedEntries.filter(
				(item) => !current.includes(item.content.id),
			);
			console.log(
				"fetched timeline entries, sorted:",
				sortedEntries.length,
				"unsorted:",
				unsortedEntries.length,
				"new:",
				newEntries.length,
			);
			return [...current, ...newEntries.map((item) => item.content.id)];
		});
		setIsLoading(false);
	};

	useEffect(() => {
		// not sure if we can just blindly believe database entries like that
		// but probably yeah
		getPotentiallyUngroupedTweets().then((ungroupedTweets) => {
			setAllTweets((current) => {
				const toAdd = ungroupedTweets
					.filter(
						(t) =>
							!(t.id in (t.payload.favedeck?.quoteOf ?? {})) &&
							!current.includes(t.id),
					)
					.map((t) => {
						addEntities(t.payload);
						return t.id;
					});
				return [...current, ...toAdd];
			});
		});
	}, []);

	useEffect(() => {
		internalsEventTarget.addEventListener(
			"bookmarks-timeline-fetched",
			refetchTweetEntries,
		);
		return () =>
			internalsEventTarget.removeEventListener(
				"bookmarks-timeline-fetched",
				refetchTweetEntries,
			);
	}, []);

	const handleTweetOpacity = (
		operation: Parameters<DragDropEvents["dragend"]>["0"]["operation"],
	) => {
		const element = operation.source?.element as HTMLElement | undefined;
		if (element)
			element.style.opacity = operation.target === null ? "1" : "0.75";
	};

	const onClose = useCallback(() => {
		closingRef.current = true;
		// remember last cursor
		(async () => {
			const state = await kv.sortBookmarksState.get();
			const latestSortedTweet = await getLatestSortedTweet();

			const previousCursor = getBottomBookmarksTimelineCursor(-2);
			const currentCursor = getBottomBookmarksTimelineCursor(-1);

			if (
				latestSortedTweet &&
				previousCursor &&
				currentCursor &&
				getBottomBookmarksTimelineCursor()?.entryId !==
					state?.currentCursor.entryId
			) {
				console.log(
					"saving new state",
					previousCursor,
					currentCursor,
					latestSortedTweet,
				);
				await kv.sortBookmarksState.set({
					previousCursor,
					currentCursor,
					latestSortedTweet,
				});
			}
			props.onClose();
		})();
	}, [hiddenTweets]);

	useEffect(() => {
		if (sortedTweets.length === 5) {
			setAllTweets((cur) => cur.slice(5));
			setSortedTweets([]);
		} else if (sortedTweets.length === allTweets.length && !isLoading)
			queueMicrotask(refetchTweetEntries);
	}, [allTweets, sortedTweets, isLoading]);

	return (
		<>
			<TwitterModal className="p-0 w-[95%] h-[95%]" onClose={onClose}>
				<div className="flex flex-row justify-between items-center pt-8 px-8">
					<div className="flex flex-row gap-4 items-center">
						<IconButton onClick={onClose}>
							<CloseIcon width={24} height={24} />
						</IconButton>
						<p className="font-bold text-2xl">Sort bookmarks</p>
					</div>
					<p className="opacity-75">Sorted: {sortedCount}</p>
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

								try {
									switch (target) {
										case "unbookmark": {
											await unbookmarkTweet(tweet);
											break;
										}
										case "new-deck": {
											setPendingNewDeckTweet({
												id: tweet,
												index: allTweets.indexOf(tweet),
											});
											break;
										}
										default: {
											await addTweetToDeck(target, tweet);
											break;
										}
									}

									setSortedTweets((cur) => [...cur, tweet]);
									setHiddenTweets((cur) => [...cur, tweet]);
									setSortedCount((c) => c + 1);
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
							{isLoading ? (
								<div className="h-[40%] w-full flex flex-col justify-center items-center gap-2">
									<Spinner size="large" />
									<p className="text-lg">Loading more bookmarks</p>
								</div>
							) : (
								allTweets
									.slice(0, 5)
									.map(
										(id, idx) =>
											!sortedTweets.includes(id) && (
												<DraggableTweetCard id={id} key={id} index={idx} />
											),
									)
							)}
						</tweetComponents.ContextBridge>
					</DragDropProvider>
				</div>
			</TwitterModal>
			{pendingNewDeckTweet && (
				<CreateDeckModal
					onClose={(cancelled) => {
						if (cancelled)
							setSortedTweets((cur) =>
								cur.filter((t) => t !== pendingNewDeckTweet.id),
							);
						setPendingNewDeckTweet(undefined);
					}}
					onCreated={(id) => addTweetToDeck(id, pendingNewDeckTweet.id)}
				/>
			)}
		</>
	);
}
