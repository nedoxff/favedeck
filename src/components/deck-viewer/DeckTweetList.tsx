import type { Draggable } from "@dnd-kit/dom";
import { move } from "@dnd-kit/helpers";
import { DragDropProvider, DragOverlay } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { Result } from "better-result";
import { useLiveQuery } from "dexie-react-hooks";
import { deepEqual } from "fast-equals";
import { Masonry, type MasonryProps, useInfiniteLoader } from "masonic";
import { memoize } from "micro-memoize";
import React, { memo } from "react";
import { tweetsEventTarget } from "@/src/features/events/tweets";
import {
	getDeckSize,
	getDeckTweets,
	updateTweetsOrder,
} from "@/src/features/storage/decks";
import type { DatabaseDeck } from "@/src/features/storage/definition";
import { cn } from "@/src/helpers/cn";
import {
	convertDatabaseTweetToMasonryInfos,
	type MediaInfo,
	type TweetMasonryInfo,
} from "@/src/internals/goodies";
import {
	addEntitiesFromDatabaseTweets,
	checkDatabaseTweets,
} from "@/src/internals/redux";
import { webpack } from "@/src/internals/webpack";
import BookmarkIcon from "~icons/mdi/bookmark";
import DragVerticalIcon from "~icons/mdi/drag-vertical";
import SadSmileyIcon from "~icons/mdi/emoticon-sad-outline";
import { IconButton } from "../common/IconButton";
import { TweetWrapper } from "../external/TweetWrapper";
import { components } from "../wrapper";

const TWEET_LIST_FETCH_COUNT = 20;
const TWEET_LIST_FETCH_THRESHOLD = 10;

function GenericTweetMasonry<T extends { id: string }>(
	props: {
		deck: DatabaseDeck;
		fetcher: (start: number, stop: number) => Promise<T[]>;
		overlayRenderer: React.ComponentType<{
			draggable: Draggable<MasonrySortableData | RegularSortableData>;
		}>;
	} & Omit<MasonryProps<T>, "items">,
) {
	const deckSize = useLiveQuery(() => getDeckSize(props.deck.id), [], 0);
	const [tweets, setTweets] = useState<T[]>([]);
	const [initialFetchDone, setInitialFetchDone] = useState(false);

	const [changesCount, setChangesCount] = useState(0);
	useEffect(() => {
		const unbookmarkedListener = (ev: CustomEvent<string>) => {
			setTweets((tweets) =>
				tweets.filter((tweet) => !tweet.id.startsWith(ev.detail)),
			);
			setChangesCount((c) => c + 1);
		};
		const undeckedListener = (
			ev: CustomEvent<{ deck: string; tweet: string }>,
		) => {
			if (props.deck.id === ev.detail.deck) {
				setTweets((tweets) =>
					tweets.filter((tweet) => !tweet.id.startsWith(ev.detail.tweet)),
				);
				setChangesCount((c) => c + 1);
			}
		};

		tweetsEventTarget.addEventListener(
			"tweet-unbookmarked",
			unbookmarkedListener,
		);
		tweetsEventTarget.addEventListener("tweet-undecked", undeckedListener);
		return () => {
			tweetsEventTarget.removeEventListener(
				"tweet-unbookmarked",
				unbookmarkedListener,
			);
			tweetsEventTarget.removeEventListener("tweet-undecked", undeckedListener);
		};
	}, [tweets]);

	const maybeLoadMore = useInfiniteLoader(
		async (start, stop) => {
			console.log(
				"fetching more tweets: total",
				deckSize,
				"start",
				start,
				"stop",
				stop,
			);
			const newTweets = await props.fetcher(start, stop);
			setTweets((current) => [
				...current,
				...newTweets.filter((t) => !current.some((t1) => deepEqual(t, t1))),
			]);
		},
		{
			isItemLoaded: (index, items) => !!items[index],
			threshold: TWEET_LIST_FETCH_THRESHOLD,
			minimumBatchSize: TWEET_LIST_FETCH_COUNT,
			totalItems: deckSize,
		},
	);

	useEffect(() => {
		props
			.fetcher(0, TWEET_LIST_FETCH_COUNT)
			.then(setTweets)
			.then(() => setInitialFetchDone(true));
	}, []);

	return initialFetchDone && tweets.length === 0 ? (
		<div className="flex flex-col justify-center items-center p-4 opacity-60 gap-1">
			<SadSmileyIcon width={64} height={64} />
			<p className="text-xl font-medium">This deck is empty</p>
		</div>
	) : (
		<DragDropProvider
			onDragEnd={(ev) => {
				setChangesCount((c) => c + 1);
				setTweets((tweets) => {
					const newTweets = move(tweets, ev);
					updateTweetsOrder(
						props.deck.id,
						ev.operation.source?.data.type === "masonry"
							? newTweets.map((t) => t.id.split("-")[0])
							: newTweets.map((t) => t.id),
					);
					return newTweets;
				});
			}}
			onDragOver={(ev) => {
				ev.preventDefault();
			}}
		>
			<Masonry
				onRender={maybeLoadMore}
				itemKey={(it) => it.id}
				key={changesCount}
				{...props}
				items={tweets}
			/>

			<DragOverlay>
				{(source) =>
					!source.isDropping && <props.overlayRenderer draggable={source} />
				}
			</DragOverlay>
		</DragDropProvider>
	);
}

type RegularSortableData = {
	type: "regular";
	width: number;
};

type MasonrySortableData = {
	type: "masonry";
	width: number;
	info: TweetMasonryInfo;
};

const DeckMasonryListItem = memo(function DeckMasonryListItem(props: {
	width: number;
	data: TweetMasonryInfo;
	index: number;
}) {
	const { ref, handleRef, isDragging, isDropTarget } = useSortable({
		id: props.data.id,
		index: props.index,
		data: {
			type: "masonry",
			info: props.data,
			width: props.width,
		} satisfies MasonrySortableData,
	});
	const url = `/${props.data.author.name}/status/${props.data.tweet}${props.data.info.type === "photo" ? `/photo/${props.data.info.index}` : ""}`;
	return (
		<article
			ref={ref}
			className={cn(
				"rounded-2xl overflow-hidden relative group transition-all",
				isDragging ? "opacity-25" : "opacity-100",
				isDropTarget ? "ring-4! ring-fd-primary!" : "ring-0",
			)}
			onMouseEnter={(ev) => {
				const video = ev.currentTarget.querySelector("video");
				if (video) video.play();
			}}
			onMouseLeave={(ev) => {
				const video = ev.currentTarget.querySelector("video");
				if (video) {
					video.pause();
					video.currentTime = 0;
				}
			}}
		>
			<a
				href={url}
				onClick={(ev) => {
					ev.preventDefault();
					webpack.common.history.push(url);
				}}
			>
				<img
					key={props.data.id}
					src={
						props.data.info.type !== "photo"
							? props.data.info.thumbnail
							: props.data.info.url
					}
					width={props.data.info.width}
					height={props.data.info.height}
					alt="meow"
				/>
				{props.data.info.type !== "photo" && (
					<video
						src={props.data.info.url}
						width={props.data.info.width}
						height={props.data.info.height}
						className="absolute top-0 left-0 w-full h-full hidden group-hover:flex!"
						loop
						muted
					/>
				)}
			</a>
			<div className="absolute w-full h-full top-0 left-0 group-hover:flex! pointer-events-none rounded-2xl hidden bg-black/25"></div>
			<div className="absolute top-2 left-2 group-hover:flex! hidden flex-row justify-end items-center z-1">
				<IconButton
					className="hover:shadow-darken! bg-white w-9 h-9"
					ref={handleRef}
				>
					<DragVerticalIcon
						className="text-fd-primary"
						width={24}
						height={24}
					/>
				</IconButton>
			</div>
			<a
				href={`/${props.data.author.name}`}
				onClick={(ev) => {
					ev.preventDefault();
					webpack.common.history.push(`/${props.data.author.name}`);
				}}
				className="absolute bottom-2 left-2 z-1"
			>
				<img
					className="rounded-full aspect-square w-9"
					src={props.data.author.profileImage}
					alt="pfp"
					style={{
						filter: "drop-shadow(rgba(0, 0, 0, 0.35) 0 0 10px)",
					}}
				/>
			</a>
			<div className="absolute bottom-2 right-2 group-hover:flex! hidden flex-row justify-end items-center z-1">
				<IconButton
					className="hover:shadow-darken! bg-white w-9 h-9"
					data-favedeck-tweet-id={props.data.tweet}
					onClick={(ev) => {
						ev.stopPropagation();
						ev.preventDefault();

						components.SelectDeckPopup.initiator === ev.currentTarget
							? components.SelectDeckPopup.hide()
							: components.SelectDeckPopup.show(
									ev.currentTarget,
									"masonry-cell",
								);
					}}
				>
					<BookmarkIcon className="text-fd-primary" width={24} height={24} />
				</IconButton>
			</div>
		</article>
	);
});

export function DeckMasonryList(props: { deck: DatabaseDeck }) {
	// note: thank your past self for implementing react proxies.
	return (
		<div className="grow p-4">
			<GenericTweetMasonry<TweetMasonryInfo>
				deck={props.deck}
				fetcher={memoize(async (start, stop) =>
					(
						await Result.gen(async function* () {
							{
								// TODO: checkDatabaseTweets probably not needed here?
								const newTweets = await getDeckTweets(
									props.deck.id,
									start,
									stop - start + 1,
								);
								yield* Result.await(addEntitiesFromDatabaseTweets(newTweets));
								const infos: TweetMasonryInfo[] = [];
								for (const tweet of newTweets) {
									infos.push(
										...(yield* Result.await(
											convertDatabaseTweetToMasonryInfos(tweet.id),
										)),
									);
								}
								return Result.ok(infos);
							}
						})
					).match({
						ok: (v) => v,
						err: (err) => {
							console.error(
								"failed to fetch items for DeckMasonryList from",
								start,
								"to",
								stop,
								err,
							);
							return [];
						},
					}),
				)}
				render={DeckMasonryListItem}
				overlayRenderer={React.memo(
					({ draggable }) => {
						const mediaInfo: MediaInfo = draggable.data.info.info;
						return (
							draggable.data.type === "masonry" &&
							!draggable.isDropping && (
								<img
									src={
										mediaInfo.type !== "photo"
											? mediaInfo.thumbnail
											: mediaInfo.url
									}
									width={draggable.data.width}
									height={
										mediaInfo.height * (draggable.data.width / mediaInfo.width)
									}
									alt="meow"
									className="rounded-2xl"
								/>
							)
						);
					},
					(prev, next) => prev.draggable.id === next.draggable.id,
				)}
				columnGutter={8}
				rowGutter={8}
				columnCount={2}
			/>
		</div>
	);
}

const SortableTweetWrapper = memo(function ScrollableTweetWrapper(props: {
	data: { id: string };
	index: number;
	width: number;
}) {
	const { ref, handleRef, isDragging, isDropTarget } = useSortable({
		id: props.data.id,
		index: props.index,
		data: {
			type: "regular",
			width: props.width,
		} satisfies RegularSortableData,
	});
	return (
		<div className="relative">
			{/* TODO: man this is so ugly */}
			<IconButton
				ref={handleRef}
				className="absolute top right-11 top-1.5 opacity-75 z-10 group hover:opacity-100 hover:bg-fd-primary/25! transition-all"
			>
				<DragVerticalIcon
					className="group-hover:text-fd-primary!"
					width={18}
					height={18}
				/>
			</IconButton>
			<TweetWrapper
				ref={ref}
				id={props.data.id}
				className={cn(
					"transition-all",
					isDragging ? "opacity-25" : "opacity-100",
					isDropTarget ? "ring-4! ring-fd-primary!" : "ring-0",
				)}
			/>
		</div>
	);
});

export function DeckTweetList(props: { deck: DatabaseDeck }) {
	// note: thank your past self for implementing react proxies.
	return (
		<div className="grow">
			<GenericTweetMasonry<{ id: string }>
				deck={props.deck}
				fetcher={memoize(async (start, stop) =>
					(
						await Result.gen(async function* () {
							const tweets = yield* Result.await(
								checkDatabaseTweets(
									await getDeckTweets(props.deck.id, start, stop - start + 1),
								),
							);
							yield* Result.await(addEntitiesFromDatabaseTweets(tweets));
							return Result.ok(tweets.map((t) => ({ id: t.id })));
						})
					).match({
						ok: (v) => v,
						err: (err) => {
							console.error(
								"failed to fetch items for DeckTweetList from",
								start,
								"to",
								stop,
								err,
							);
							return [];
						},
					}),
				)}
				render={SortableTweetWrapper}
				overlayRenderer={React.memo(
					({ draggable }) =>
						draggable.data.type === "regular" &&
						typeof draggable.id === "string" && (
							<TweetWrapper
								style={{ width: `${draggable.data.width}px` }}
								className="bg-fd-bg/50 rounded-2xl overflow-hidden"
								id={draggable.id}
								patchOptions={{
									shouldDisplayBorder: false,
									isClickable: false,
								}}
							/>
						),
					(prev, next) => prev.draggable.id === next.draggable.id,
				)}
				columnCount={1}
			/>
		</div>
	);
}
