import { pointerIntersection } from "@dnd-kit/collision";
import { useDraggable, useDroppable } from "@dnd-kit/react";
import { useLiveQuery } from "dexie-react-hooks";
import { memo, type ReactNode } from "react";
import { getDeckSize, getDeckThumbnails } from "@/src/features/storage/decks";
import type { DatabaseDeck } from "@/src/features/storage/definition";
import { cn } from "@/src/helpers/cn";
import BookmarkIcon from "~icons/mdi/bookmark";
import DotsIcon from "~icons/mdi/dots-horizontal";
import LockIcon from "~icons/mdi/lock-outline";
import PlusIcon from "~icons/mdi/plus";
import { TweetWrapper } from "../../external/TweetWrapper";
import { type SortBookmarksActions, useSortBookmarksState } from "./state";

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

export function DeckItem(props: { deck: DatabaseDeck }) {
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

export function DraggableTweetCard(props: { id: string; index?: number }) {
	const { ref, isDragging } = useDraggable({
		id: props.id,
	});

	return (
		<div
			ref={ref}
			className={
				props.index !== undefined
					? "w-[25%] absolute top-[65%] transition-all hover:rotate-0 hover:top-[55%] animate-sort-slide-up!"
					: ""
			}
			style={
				props.index !== undefined
					? {
							left: `${(props.index + 1) * 12.5}%`,
							rotate: isDragging ? "0deg" : `${props.index * 0.8 - 2}deg`,
							animationDelay: `${props.index * 100}ms`,
						}
					: undefined
			}
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

export function CustomDropCard(props: {
	id: string;
	children: ReactNode;
	clickAction?: {
		title: string;
		onClick?: () => void;
	};
}) {
	const { isDropTarget, ref } = useDroppable({
		id: props.id,
		collisionDetector: pointerIntersection,
	});

	return (
		<div
			ref={ref}
			className={cn(
				"transition-all group rounded-xl border-dashed border-2 flex flex-col gap-2 justify-center items-center h-full",
				isDropTarget && "border-fd-primary!",
				props.clickAction &&
					cn(
						"hover:border-fd-primary!",
						props.clickAction.onClick !== undefined
							? "hover:cursor-pointer!"
							: "hover:cursor-not-allowed!",
					),
			)}
			role={props.clickAction ? "button" : undefined}
			onClick={props.clickAction?.onClick}
		>
			{props.children}
			{props.clickAction && (
				<p className="opacity-75 text-center px-2 hidden group-hover:block!">
					{props.clickAction.title}
				</p>
			)}
		</div>
	);
}

export function CustomCardRow(props: { actions: SortBookmarksActions }) {
	const { addedIntentionallyUngroupedTweets } = useSortBookmarksState();

	return (
		<>
			<CustomDropCard id="unbookmark">
				<BookmarkIcon width={48} height={48} />
				<p className="text-xl text-center">Remove from bookmarks</p>
			</CustomDropCard>
			<CustomDropCard
				id="later"
				clickAction={
					addedIntentionallyUngroupedTweets
						? {
								title: "You've already added the tweets!",
							}
						: {
								title: "Click if it's time to deal with them",
								onClick: props.actions.appendIntentionallyUngroupedTweets,
							}
				}
			>
				<DotsIcon width={48} height={48} />
				<p className="text-xl text-center">I'll deal with it later</p>
			</CustomDropCard>
			<CustomDropCard
				id="new-deck"
				clickAction={{
					title: "Click to create a new deck without adding any tweets",
					onClick: () => props.actions.addTweetToNewDeck(),
				}}
			>
				<PlusIcon width={48} height={48} />
				<p className="text-xl text-center">New deck</p>
			</CustomDropCard>
		</>
	);
}
