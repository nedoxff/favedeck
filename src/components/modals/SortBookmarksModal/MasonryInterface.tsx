import { DragDropProvider } from "@dnd-kit/react";
import { useLiveQuery } from "dexie-react-hooks";
import {
	useInfiniteLoader,
	useMasonry,
	usePositioner,
	useResizeObserver,
} from "masonic";
import { memoize } from "micro-memoize";
import { useScroller, useSize } from "mini-virtual-list";
import { memo, useDeferredValue } from "react";
import { getUserDecksAutomatically } from "@/src/features/storage/decks";
import { tweetComponents } from "../../external/Tweet";
import { CustomCardRow, DeckItem, DraggableTweetCard } from "./common";
import { type SortBookmarksActions, useSortBookmarksState } from "./state";

const InternalMasonryTweet = memo(
	function InternalMasonryTweet(props: { data: { id: string } }) {
		return <DraggableTweetCard id={props.data.id} />;
	},
	(prev, cur) => prev.data.id === cur.data.id,
);

function InternalMasonryList() {
	const { allTweets, sortedTweets, setIsDone, refetchTweetEntries } =
		useSortBookmarksState();

	const displayedTweets = useMemo(
		() =>
			allTweets
				.filter((id) => !sortedTweets.includes(id))
				.map((id) => ({ id })),
		[allTweets, sortedTweets],
	);
	const loader = useMemo(
		() =>
			memoize((start: number, stop: number) => {
				console.log(start, stop);
				refetchTweetEntries(true);
			}),
		[refetchTweetEntries],
	);
	const maybeLoadMore = useInfiniteLoader(loader, {
		isItemLoaded: (index, items) => !!items[index],
	});

	useEffect(() => {
		if (displayedTweets.length === 0) setIsDone(true);
	}, [displayedTweets]);

	const container = useRef<HTMLDivElement>(null);
	const scrollInfo = useScroller(container);
	const { width, height } = useSize(container);
	const { isScrolling, scrollTop } = useDeferredValue(scrollInfo);

	const positioner = usePositioner(
		{ width: width - 64, columnCount: 2, columnGutter: 8, rowGutter: 8 },
		[displayedTweets],
	);
	const resizeObserver = useResizeObserver(positioner);

	return (
		<div className="w-2/5 min-w-2/5 overflow-scroll px-8" ref={container}>
			<tweetComponents.ContextBridge>
				{useMasonry({
					positioner,
					resizeObserver,
					scrollTop,
					isScrolling,
					height,
					onRender: maybeLoadMore,
					render: InternalMasonryTweet,
					itemKey: (i) => i.id,
					items: displayedTweets,
				})}
			</tweetComponents.ContextBridge>
		</div>
	);
}

export default function MasonryInterface(props: {
	actions: SortBookmarksActions;
}) {
	const userDecks = useLiveQuery(getUserDecksAutomatically, [], []);

	return (
		<div className="grow relative overflow-hidden flex flex-row">
			<DragDropProvider
				onDragOver={props.actions.onDragOver}
				onDragEnd={props.actions.onDragEnd}
			>
				<InternalMasonryList />
				<hr className="border-l-2! h-full" />
				<div className="grow flex flex-col *:w-full">
					<div className="grow overflow-scroll scroll-shadow p-8 pt-0">
						<div className="flex flex-row flex-wrap">
							{userDecks.map((ud) => (
								<DeckItem key={ud.id} deck={ud} />
							))}
						</div>
					</div>
					<hr className="border-b-2! border-t-0!" />
					<div className="h-1/4 py-6 px-4 flex flex-row justify-around *:w-1/4">
						<CustomCardRow actions={props.actions} />
					</div>
				</div>
			</DragDropProvider>
		</div>
	);
}
