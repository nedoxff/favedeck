import { DragDropProvider } from "@dnd-kit/react";
import { useLiveQuery } from "dexie-react-hooks";
import { getUserDecksAutomatically } from "@/src/features/storage/decks";
import Spinner from "../../common/Spinner";
import { tweetComponents } from "../../external/Tweet";
import { CustomCardRow, DeckItem, DraggableTweetCard } from "./common";
import { type SortBookmarksActions, useSortBookmarksState } from "./state";

export default function CardGameInterface(props: {
	actions: SortBookmarksActions;
}) {
	const {
		allTweets,
		sortedTweets,
		isFetchingTweets,
		refetchTweetEntries,
		setAllTweets,
		setSortedTweets,
	} = useSortBookmarksState();
	const userDecks = useLiveQuery(getUserDecksAutomatically, [], []);

	useEffect(() => {
		if (sortedTweets.length === 5) {
			setAllTweets((cur) => cur.slice(5));
			setSortedTweets(() => []);
		} else if (sortedTweets.length === allTweets.length && !isFetchingTweets)
			queueMicrotask(refetchTweetEntries);
	}, [allTweets, sortedTweets, isFetchingTweets]);

	return (
		<div className="grow relative overflow-hidden px-8">
			<DragDropProvider
				onDragOver={props.actions.onDragOver}
				onDragEnd={props.actions.onDragEnd}
			>
				<div className="h-[60%] flex flex-row gap-4">
					<div className="basis-3/4 overflow-scroll scroll-shadow">
						<div className="flex flex-row flex-wrap">
							{userDecks.map((ud) => (
								<DeckItem key={ud.id} deck={ud} />
							))}
						</div>
					</div>
					<div className="flex flex-col gap-4 py-2 basis-1/4 *:basis-1/2">
						<CustomCardRow actions={props.actions} />
					</div>
				</div>
				<tweetComponents.ContextBridge>
					{isFetchingTweets ? (
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
	);
}
