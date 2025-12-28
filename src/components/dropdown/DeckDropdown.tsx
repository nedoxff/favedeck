import clsx from "clsx";
import { forwardRef } from "react";
import { createPortal } from "react-dom";
import { decksEventTarget } from "@/src/features/events/decks";
import { type DatabaseDeck, db } from "@/src/features/storage/definition";
import VerticalMoreIcon from "~icons/mdi/dots-vertical";
import EditIcon from "~icons/mdi/pencil-outline";
import DeleteIcon from "~icons/mdi/trash-can-outline";
import ConfirmModal from "../modals/ConfirmModal";
import EditDeckModal from "../modals/EditDeckModal";
import { TwitterDropdown, TwitterDropdownItem } from "./TwitterDropdown";

export default function DeckDropdown(props: {
	deck: DatabaseDeck;
	className?: string;
}) {
	const [showEditModal, setShowEditModal] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);

	return props.deck.id === "ungrouped" ? null : (
		<>
			<TwitterDropdown<HTMLButtonElement>
				trigger={forwardRef(({ isOpen, setOpen }, ref) => (
					<button
						type="button"
						ref={ref}
						className={clsx(
							"rounded-full aspect-square justify-center items-center p-2 h-fit hover:shadow-lighten!",
							props.className,
						)}
						onClick={(ev) => {
							ev.stopPropagation();
							setOpen(!isOpen);
						}}
					>
						<VerticalMoreIcon width={24} height={24} />
					</button>
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
							await db.decks.delete(props.deck.id);
							if (decksEventTarget.currentDeck === props.deck.id)
								decksEventTarget.setCurrentDeck(null);
						}}
					/>,
					document.body,
				)}
		</>
	);
}
