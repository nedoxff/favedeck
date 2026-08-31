import type { DragDropEvents } from "@dnd-kit/react";
import { Result } from "better-result";
import Confetti from "react-confetti-boom";
import { internalsEventTarget } from "@/src/features/events/internals";
import type { DatabasePotentiallyUngroupedTweet } from "@/src/features/storage/definition";
import { kv } from "@/src/features/storage/kv";
import {
	addPotentiallyUngroupedTweet,
	checkPotentiallyUngroupedTweets,
	getPotentiallyUngroupedTweets,
	removePotentiallyUngroupedTweet,
} from "@/src/features/storage/potentially-ungrouped";
import { setSetting } from "@/src/features/storage/settings";
import {
	addTweetToDeck,
	getLatestSortedTweet,
	splitTweets,
} from "@/src/features/storage/tweets";
import { getUserId } from "@/src/internals/foolproof";
import {
	addEntities,
	fetchTimelineFromCursor,
	getBottomTimelineCursor,
	getTimelineEntries,
	unbookmarkTweet,
	unlikeTweet,
} from "@/src/internals/redux";
import { webpack } from "@/src/internals/webpack";
import CloseIcon from "~icons/mdi/close";
import { DeckCategoryContext } from "../../common/contexts";
import { IconButton } from "../../common/IconButton";
import { components } from "../../wrapper";
import CreateDeckModal from "../CreateDeckModal";
import { TwitterModal } from "../TwitterModal";
import CardGameInterface from "./CardGameInterface";
import MasonryInterface from "./MasonryInterface";
import SelectSortBookmarksInterface from "./SelectInterface";
import {
	type PendingNewDeckTweet,
	type SortTweetsActions,
	useSortTweetsState,
} from "./state";

export default function SortBookmarksModal(props: {
	onClose: () => void;
	category: "bookmarks" | "likes";
}) {
	const {
		allTweets,
		isDone,
		selectedInterface,
		reset,
		setSelectedInterface,
		setIsDone,
		setAllTweets,
		setSortedTweets,
		setAddedIntentionallyUngroupedTweets,
		setIsFetchingTweets,
		setRefetchTweetEntries,
	} = useSortTweetsState();

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
	const previousBookmarksTimelineEntriesCountRef = useRef(-1);

	const [pendingNewDeckTweet, setPendingNewDeckTweet] = useState<
		PendingNewDeckTweet | undefined
	>(undefined);
	const [showCreateDeckModal, setShowCreateDeckModal] = useState(false);

	const refetchTweetEntries = async (
		force?: boolean,
		fromCallback?: boolean,
	) => {
		const timelineId =
			props.category === "bookmarks"
				? "bookmarks"
				: `favorites-${(await getUserId()) ?? ""}`;
		const modalState = useSortTweetsState.getState();
		if (modalState.isDone) return;

		const rawEntries = getTimelineEntries(timelineId).filter(
			(entry) => entry.type === "tweet",
		);

		if (
			previousBookmarksTimelineEntriesCountRef.current === rawEntries.length &&
			(fromCallback ?? false)
		) {
			if (
				modalState.allTweets.length === modalState.sortedTweets.length ||
				modalState.allTweets.length === 0
			) {
				console.log("sorted all bookmarks!");
				setIsDone(true);
			}
			setIsFetchingTweets(false);
			return;
		} else previousBookmarksTimelineEntriesCountRef.current = rawEntries.length;

		setIsFetchingTweets(true);
		const [unsortedEntries, sortedEntries] = await splitTweets(
			rawEntries,
			props.category,
		);
		const state = await kv.sortTweetsState.get();

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
				modalState.selectedInterface !== "masonry" &&
				state &&
				(rawEntries.at(-1)?.sortIndex ?? "") <=
					state.latestSortedTweet.sortIndex;
			const timelineProvider =
				props.category === "bookmarks"
					? webpack.common.redux.api.bookmarksTimeline
					: webpack.common.redux.api.favoritesTimeline;

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
				await fetchTimelineFromCursor(timelineProvider, state.previousCursor);
			} else {
				const bottomCursor = getBottomTimelineCursor(timelineId);
				console.log("no unsorted entries, fetching from bottom", bottomCursor);
				if (bottomCursor)
					await fetchTimelineFromCursor(timelineProvider, bottomCursor);
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

	const appendUngroupedTweets = async (
		category: DatabasePotentiallyUngroupedTweet["category"],
	) => {
		const ungroupedTweets = await checkPotentiallyUngroupedTweets(
			await getPotentiallyUngroupedTweets(category),
			category,
		);
		setSortedTweets((current) =>
			current.filter((t) => !ungroupedTweets.some((ut) => ut.id === t)),
		);
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
		appendUngroupedTweets(
			props.category === "bookmarks" ? "unbookmarked" : "unliked",
		);
	}, []);

	useEffect(() => {
		const listener = () => refetchTweetEntries(false, true);
		internalsEventTarget.addEventListener("timeline-fetched", listener);
		return () =>
			internalsEventTarget.removeEventListener("timeline-fetched", listener);
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
			if (useSortTweetsState.getState().selectedInterface !== "masonry") {
				const state = await kv.sortTweetsState.get();
				const latestSortedTweet = await getLatestSortedTweet(props.category);
				const timelineId =
					props.category === "bookmarks"
						? "bookmarks"
						: `favorites-${(await getUserId()) ?? ""}`;

				const previousCursor = getBottomTimelineCursor(timelineId, -2);
				const currentCursor = getBottomTimelineCursor(timelineId, -1);

				if (
					latestSortedTweet &&
					previousCursor &&
					currentCursor &&
					getBottomTimelineCursor(timelineId)?.entryId !==
						state?.currentCursor.entryId
				) {
					console.log(
						"saving new state",
						previousCursor,
						currentCursor,
						latestSortedTweet,
					);
					await kv.sortTweetsState.set({
						previousCursor,
						currentCursor,
						latestSortedTweet,
					});
				}
			}

			reset();
			props.onClose();
		})();
	}, []);

	const actions: SortTweetsActions = {
		appendIntentionallyUngroupedTweets: async () => {
			await appendUngroupedTweets(
				props.category === "bookmarks"
					? "intentional_bookmarks"
					: "intentional_likes",
			);
			setIsDone(false);
			setAddedIntentionallyUngroupedTweets(true);
		},
		onDragEnd: async (ev) => {
			handleTweetOpacity(ev.operation);
			if (ev.operation.source && ev.operation.target) {
				(ev.operation.source.element as HTMLElement).style.display = "none";

				const tweet = ev.operation.source.id.toString();
				const target = ev.operation.target.id.toString();

				const result = await Result.tryPromise(async () => {
					switch (target) {
						case "uninteract": {
							const uninteractResult =
								props.category === "bookmarks"
									? await unbookmarkTweet(tweet)
									: await unlikeTweet(tweet);
							if (uninteractResult.isErr())
								throw Error(`failed to remove tweet`, {
									cause: uninteractResult.error,
								});
							break;
						}
						case "later": {
							await addPotentiallyUngroupedTweet(
								tweet,
								props.category === "bookmarks"
									? "intentional_bookmarks"
									: "intentional_likes",
							);
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
							const addResult = await addTweetToDeck(tweet, target);
							if (addResult.isErr())
								throw Error("failed to add tweet to deck", {
									cause: addResult.error,
								});
							await removePotentiallyUngroupedTweet(
								tweet,
								props.category === "bookmarks" ? ["unbookmarked"] : ["unliked"],
							);
							const node = document.querySelector(
								`div[data-favedeck-id="${tweet}"]`,
							);
							if (node)
								components.DeckViewer.checkTweet(node as HTMLElement, tweet);
							break;
						}
					}

					internalsEventTarget.dispatchTweetSorted(tweet);
					setSortedTweets((cur) => [...cur, tweet]);
				});

				if (result.isErr()) {
					console.error(`failed to drop ${tweet} into ${target}`, result.error);
					components.Toast.error(
						"Failed to process the dropped tweet",
						result.error,
					);
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
		<DeckCategoryContext.Provider value={props.category}>
			<TwitterModal className="p-0 w-[95%] h-[95%] relative" onClose={onClose}>
				<div className="flex flex-row justify-between items-center pt-8 px-8">
					<div className="flex flex-row gap-4 items-center">
						<IconButton onClick={onClose}>
							<CloseIcon width={24} height={24} />
						</IconButton>
						<p className="font-bold text-2xl">
							Sort {props.category === "bookmarks" ? "bookmarks" : "likes"}
						</p>
					</div>
				</div>
				{body}
				{isDone && (
					<Confetti
						className="absolute w-full h-full pointer-events-none"
						mode="boom"
						particleCount={50}
						launchSpeed={2.5}
						y={1.0}
						x={0.5}
						effectCount={1}
					/>
				)}
			</TwitterModal>
			{showCreateDeckModal && (
				<CreateDeckModal
					category={props.category}
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
						await removePotentiallyUngroupedTweet(
							id,
							props.category === "bookmarks" ? ["unbookmarked"] : ["unliked"],
						);
						const node = document.querySelector(
							`div[data-favedeck-id="${id}"]`,
						);
						if (node) components.DeckViewer.checkTweet(node as HTMLElement, id);
					}}
				/>
			)}
		</DeckCategoryContext.Provider>
	);
}
