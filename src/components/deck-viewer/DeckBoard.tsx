/** biome-ignore-all lint/a11y/useSemanticElements: TODO */
/** biome-ignore-all lint/a11y/useFocusableInteractive: TODO */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: TODO */

import clsx from "clsx";
import { useLiveQuery } from "dexie-react-hooks";
import { createPortal } from "react-dom";
import { decksEventTarget } from "@/src/features/events/decks";
import {
	getDeckSize,
	getDeckThumbnails,
	getUserDecksAutomatically,
} from "@/src/features/storage/decks";
import { type DatabaseDeck, db } from "@/src/features/storage/definition";
import { cn } from "@/src/helpers/cn";
import { webpack } from "@/src/internals/webpack";
import MoreIcon from "~icons/mdi/dots-horizontal";
import LockIcon from "~icons/mdi/lock-outline";
import PlusIcon from "~icons/mdi/plus";
import DeckDropdown from "../dropdown/DeckDropdown";
import CreateDeckModal from "../modals/CreateDeckModal";

function DeckBoardItemPreview(props: {
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

function DeckBoardItem(props: { deck: DatabaseDeck }) {
	const thumbnails = useLiveQuery(() => getDeckThumbnails(props.deck.id, 3));
	const size = useLiveQuery(() => getDeckSize(props.deck.id));

	return (
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
				<DeckDropdown deck={props.deck} className="hidden group-hover:flex!" />
			</div>
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
					<PlusIcon width={36} height={36} />
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

function AllBookmarksDeckBoardItem() {
	return (
		<div
			role="button"
			onClick={(ev) => {
				ev.preventDefault();
				decksEventTarget.setCurrentDeck("all");
				webpack.common.history.push({
					hash: "#fd-all",
					pathname: "/i/bookmarks",
					state: "from-deck-view",
				});
			}}
			className="grow shrink basis-[45%] max-w-[calc(50%-8px)] h-60 hover:cursor-pointer group w-full flex flex-col gap-2 p-2 hover:shadow-lighten! rounded-2xl"
		>
			<div className="grow rounded-xl overflow-hidden relative border-dashed border-2 border-white! flex justify-center items-center opacity-50">
				<MoreIcon width={36} height={36} />
			</div>
			<div className="pointer-events-none">
				<p className="font-bold text-xl">All bookmarks</p>
				<p className="opacity-50">like all of them</p>
			</div>
		</div>
	);
}

export function DeckBoard() {
	const userDecks = useLiveQuery(getUserDecksAutomatically);

	return (
		<div className="p-4 gap-2 flex flex-row flex-wrap">
			{(userDecks ?? []).map((d) => (
				<DeckBoardItem key={d.id} deck={d} />
			))}
			<AllBookmarksDeckBoardItem />
			<NewDeckBoardItem />
		</div>
	);
}
