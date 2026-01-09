import clsx from "clsx";
import { forwardRef } from "react";
import { createPortal } from "react-dom";
import { decksEventTarget } from "@/src/features/events/decks";
import {
	deleteDeck,
	getAllDeckTweets,
	getDeckTweets,
	isTweetInDeck,
} from "@/src/features/storage/decks";
import { type DatabaseDeck, db } from "@/src/features/storage/definition";
import { getRootNodeFromTweetElement } from "@/src/internals/goodies";
import { matchers } from "@/src/internals/matchers";
import VerticalMoreIcon from "~icons/mdi/dots-vertical";
import EditIcon from "~icons/mdi/pencil-outline";
import StarIcon from "~icons/mdi/star-four-points-outline";
import DeleteIcon from "~icons/mdi/trash-can-outline";
import { IconButton } from "../common/IconButton";
import ConfirmModal from "../modals/ConfirmModal";
import EditDeckModal from "../modals/EditDeckModal";
import SortDeckModal from "../modals/SortDeckModal";
import { components } from "../wrapper";
import { TwitterDropdown, TwitterDropdownItem } from "./TwitterDropdown";

export default function DeckDropdown(props: {
	deck: DatabaseDeck;
	className?: string;
}) {
	const [showEditModal, setShowEditModal] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [showSortModal, setShowSortModal] = useState(false);

	return props.deck.id === "all" ? (
		<>
			<TwitterDropdown<HTMLButtonElement>
				trigger={forwardRef(({ isOpen, setOpen }, ref) => (
					<IconButton
						ref={ref}
						onClick={(ev) => {
							ev.stopPropagation();
							setOpen(!isOpen);
						}}
					>
						<VerticalMoreIcon width={24} height={24} />
					</IconButton>
				))}
			>
				{({ setOpen }) => (
					<>
						<TwitterDropdownItem
							icon={<StarIcon width={24} height={24} />}
							text="Sort"
							onClick={() => {
								setShowSortModal(true);
								setOpen(false);
							}}
						/>
					</>
				)}
			</TwitterDropdown>
			{showSortModal &&
				createPortal(
					<SortDeckModal onClose={() => setShowSortModal(false)} />,
					document.body,
				)}
		</>
	) : (
		<>
			<TwitterDropdown<HTMLButtonElement>
				trigger={forwardRef(({ isOpen, setOpen }, ref) => (
					<IconButton
						ref={ref}
						onClick={(ev) => {
							ev.stopPropagation();
							setOpen(!isOpen);
						}}
					>
						<VerticalMoreIcon width={24} height={24} />
					</IconButton>
				))}
			>
				{({ setOpen }) => (
					<>
						<TwitterDropdownItem
							icon={<EditIcon width={24} height={24} />}
							text="Edit deck"
							onClick={() => {
								setShowEditModal(true);
								setOpen(false);
							}}
						/>
						<TwitterDropdownItem
							icon={<DeleteIcon width={24} height={24} />}
							text="Delete deck"
							onClick={() => {
								setShowDeleteModal(true);
								setOpen(false);
							}}
						/>
					</>
				)}
			</TwitterDropdown>

			{showEditModal &&
				createPortal(
					<EditDeckModal
						deck={props.deck}
						onClose={() => setShowEditModal(false)}
					/>,
					document.body,
				)}

			{showDeleteModal &&
				createPortal(
					<ConfirmModal
						title="Delete deck"
						description="Are you sure that you want to delete this deck?"
						confirmIsDangerous
						confirmText="Yes, I'm sure"
						onCancelled={() => setShowDeleteModal(false)}
						onConfirmed={async () => {
							setShowDeleteModal(false);

							// de-highlight tweets which became ungrouped
							// note: this is really ugly but required as highlighted tweets aren't re-verified
							const tweets = (
								await (await getAllDeckTweets(props.deck.id)).toArray()
							).map((t) => t.id);
							const tweetElements = Array.from(
								document.querySelectorAll(matchers.tweet.querySelector),
							).map((n) => n as HTMLElement);

							await deleteDeck(props.deck.id);
							if (decksEventTarget.currentDeck === props.deck.id)
								decksEventTarget.setCurrentDeck(null);

							for (const el of tweetElements) {
								const info = getRootNodeFromTweetElement(el);
								if (!info || !tweets.includes(info.id)) continue;
								components.DeckViewer.checkTweet(info.rootNode, info.id);
							}
						}}
					/>,
					document.body,
				)}
		</>
	);
}
