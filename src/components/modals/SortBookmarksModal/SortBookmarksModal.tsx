import type { DragDropEvents } from "@dnd-kit/react";
import { internalsEventTarget } from "@/src/features/events/internals";
import { kv } from "@/src/features/storage/kv";
import {
	addPotentiallyUngroupedTweet,
	getPotentiallyUngroupedTweets,
	removePotentiallyUngroupedTweet,
} from "@/src/features/storage/potentially-ungrouped";
import {
	type FavedeckSettings,
	setSetting,
} from "@/src/features/storage/settings";
import {
	addTweetToDeck,
	getLatestSortedTweet,
	splitTweets,
} from "@/src/features/storage/tweets";
import {
	addEntities,
	fetchBookmarksTimelineFromCursor,
	getBookmarksTimelineEntries,
	getBottomBookmarksTimelineCursor,
	unbookmarkTweet,
} from "@/src/internals/redux";
import CloseIcon from "~icons/mdi/close";
import { IconButton } from "../../common/IconButton";
import { components } from "../../wrapper";
import CreateDeckModal from "../CreateDeckModal";
import { TwitterModal } from "../TwitterModal";
import CardGameInterface from "./CardGameInterface";
import MasonryInterface from "./MasonryInterface";
import SelectSortBookmarksInterface from "./SelectInterface";
import {
	type PendingNewDeckTweet,
	type SortBookmarksActions,
	useSortBookmarksState,
} from "./state";

export default function SortBookmarksModal(props: { onClose: () => void }) {
	const {
		allTweets,
		reset,
		setAllTweets,
		setSortedTweets,
		setAddedIntentionallyUngroupedTweets,
		setIsFetchingTweets,
		setRefetchTweetEntries,
	} = useSortBookmarksState();

	const [selectedInterface, setSelectedInterface] = useState<
		FavedeckSettings["preferredSortBookmarksInterface"] | undefined
	>(undefined);

	useEffect(() => {
		kv.settings
			.get()
			.then((settings) =>
				setSelectedInterface(
					settings?.preferredSortBookmarksInterface ?? "ask",
				),
			);
	}, []);

	const initialFetchDoneRef = useRef(false);
	const closingRef = useRef(false);
	const stateCursorUsedRef = useRef(false);
	const [pendingNewDeckTweet, setPendingNewDeckTweet] = useState<
		PendingNewDeckTweet | undefined
	>(undefined);
	const [showCreateDeckModal, setShowCreateDeckModal] = useState(false);

	const refetchTweetEntries = async (force?: boolean) => {
		setIsFetchingTweets(true);
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
		if (unsortedEntries.length === 0 || (force ?? false)) {
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
		setIsFetchingTweets(false);
	};

	const appendUngroupedTweets = (category: "unbookmarked" | "intentional") => {
		getPotentiallyUngroupedTweets(category).then((ungroupedTweets) => {
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
				return [...toAdd, ...current];
			});
		});
	};

	useEffect(() => {
		if (initialFetchDoneRef.current) return;
		setRefetchTweetEntries(refetchTweetEntries);
		queueMicrotask(refetchTweetEntries);
		initialFetchDoneRef.current = true;
	}, [initialFetchDoneRef]);

	useEffect(() => {
		// not sure if we can just blindly believe database entries like that
		// but probably yeah
		appendUngroupedTweets("unbookmarked");
	}, []);

	useEffect(() => {
		const listener = () => refetchTweetEntries();
		internalsEventTarget.addEventListener(
			"bookmarks-timeline-fetched",
			listener,
		);
		return () =>
			internalsEventTarget.removeEventListener(
				"bookmarks-timeline-fetched",
				listener,
			);
	}, []);

	const handleTweetOpacity = (
		operation: Parameters<DragDropEvents["dragover"]>[0]["operation"],
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

			reset();
			props.onClose();
		})();
	}, []);

	const actions: SortBookmarksActions = {
		appendIntentionallyUngroupedTweets: () => {
			appendUngroupedTweets("intentional");
			setAddedIntentionallyUngroupedTweets(true);
		},
		onDragEnd: async (ev) => {
			handleTweetOpacity(ev.operation);
			if (ev.operation.source && ev.operation.target) {
				(ev.operation.source.element as HTMLElement).style.display = "none";

				const tweet = ev.operation.source.id.toString();
				const target = ev.operation.target.id.toString();

				try {
					switch (target) {
						case "unbookmark": {
							await unbookmarkTweet(tweet);
							break;
						}
						case "later": {
							await addPotentiallyUngroupedTweet(tweet, "intentional");
							setAddedIntentionallyUngroupedTweets(false);
							break;
						}
						case "new-deck": {
							setPendingNewDeckTweet({
								id: tweet,
								index: allTweets.indexOf(tweet),
							});
							setShowCreateDeckModal(true);
							break;
						}
						default: {
							await addTweetToDeck(tweet, target);
							await removePotentiallyUngroupedTweet(tweet);
							const node = document.querySelector(
								`div[data-favedeck-id="${tweet}"]`,
							);
							if (node)
								components.DeckViewer.checkTweet(node as HTMLElement, tweet);
							break;
						}
					}

					setSortedTweets((cur) => [...cur, tweet]);
				} catch (err) {
					console.error(`failed to drop ${tweet} into ${target}`, err);
				}
			}
		},
		onDragOver: (ev) => handleTweetOpacity(ev.operation),
		addTweetToNewDeck: (tweet) => {
			setPendingNewDeckTweet(tweet);
			setShowCreateDeckModal(true);
		},
	};

	const body = useMemo(() => {
		switch (selectedInterface) {
			case "ask":
				return (
					<SelectSortBookmarksInterface
						onSelected={async (choice, remember) => {
							if (remember)
								await setSetting("preferredSortBookmarksInterface", choice);
							setSelectedInterface(choice);
						}}
					/>
				);
			case "card-game":
				return <CardGameInterface actions={actions} />;
			case "masonry":
				return <MasonryInterface actions={actions} />;
			default:
				return null;
		}
	}, [selectedInterface]);

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
				</div>
				{body}
			</TwitterModal>
			{showCreateDeckModal && (
				<CreateDeckModal
					onClose={(cancelled) => {
						setShowCreateDeckModal(false);
						if (cancelled && pendingNewDeckTweet)
							setSortedTweets((cur) =>
								cur.filter((t) => t !== pendingNewDeckTweet.id),
							);
						setPendingNewDeckTweet(undefined);
					}}
					onCreated={async (id) => {
						if (!pendingNewDeckTweet) return;
						await addTweetToDeck(pendingNewDeckTweet.id, id);
						await removePotentiallyUngroupedTweet(id);
						const node = document.querySelector(
							`div[data-favedeck-id="${id}"]`,
						);
						if (node) components.DeckViewer.checkTweet(node as HTMLElement, id);
					}}
				/>
			)}
		</>
	);
}
