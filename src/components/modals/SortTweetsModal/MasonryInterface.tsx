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
import { memo } from "react";
import { useShallow } from "zustand/shallow";
import { internalsEventTarget } from "@/src/features/events/internals";
import { getUserDecksAutomatically } from "@/src/features/storage/decks";
import { DeckCategoryContext } from "../../common/contexts";
import { tweetComponents } from "../../external/Tweet";
import { CustomCardRow, DeckItem, DraggableTweetCard } from "./common";
import { type SortTweetsActions, useSortTweetsState } from "./state";

const InternalMasonryTweet = memo(
	function InternalMasonryTweet(props: { data: { id: string } }) {
		return <DraggableTweetCard id={props.data.id} />;
	},
	(prev, cur) => prev.data.id === cur.data.id,
);

const cache = new Map<string, { id: string }>();
const getCacheObject = (id: string) => {
	let obj = cache.get(id);
	if (!obj) {
		obj = { id };
		cache.set(id, obj);
	}
	return obj;
};

function InternalMasonryList() {
	const [allTweets, sortedTweets, setIsDone, refetchTweetEntries] =
		useSortTweetsState(
			useShallow((s) => [
				s.allTweets,
				s.sortedTweets,
				s.setIsDone,
				s.refetchTweetEntries,
			]),
		);
	const [changesCount, setChangesCount] = useState(0);

	const displayedTweets = useMemo(
		() =>
			allTweets.filter((id) => !sortedTweets.includes(id)).map(getCacheObject),
		[allTweets, sortedTweets],
	);

	useEffect(() => {
		if (displayedTweets.length === 0) setIsDone(true);
	}, [displayedTweets]);

	useEffect(() => {
		const listener = () => setChangesCount((c) => c + 1);
		internalsEventTarget.addEventListener("tweet-sorted", listener);
		return () =>
			internalsEventTarget.removeEventListener("tweet-sorted", listener);
	}, []);

	const container = useRef<HTMLDivElement>(null);
	const { isScrolling, scrollTop } = useScroller(container);
	const { width, height } = useSize(container);

	const positioner = usePositioner(
		{
			width: width - 64,
			columnCount: 2,
			columnGutter: 8,
			rowGutter: 8,
		},
		[changesCount],
	);
	const resizeObserver = useResizeObserver(positioner);

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

	return (
		<div className="w-2/5 min-w-2/5 overflow-auto overscroll-contain px-8" ref={container}>
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
	actions: SortTweetsActions;
}) {
	const deckCategory = useContext(DeckCategoryContext);
	const userDecks = useLiveQuery(
		async () => await getUserDecksAutomatically(deckCategory),
		[deckCategory],
		[],
	);

	return (
		<div className="grow relative overflow-hidden flex flex-row">
			<DragDropProvider
				onDragOver={props.actions.onDragOver}
				onDragEnd={props.actions.onDragEnd}
			>
				<InternalMasonryList />
				<hr className="border-l-2! h-full border-fd-border" />
				<div className="grow flex flex-col *:w-full">
					<div className="grow overflow-auto overscroll-contain scroll-shadow p-8 pt-0">
						<div className="flex flex-row flex-wrap">
							{userDecks.map((ud) => (
								<DeckItem key={ud.id} deck={ud} />
							))}
						</div>
					</div>
					<hr className="border-b-2! border-t-0! border-fd-border" />
					<div className="h-1/4 py-6 px-4 flex flex-row justify-around *:w-1/4">
						<CustomCardRow actions={props.actions} />
					</div>
				</div>
			</DragDropProvider>
		</div>
	);
}
