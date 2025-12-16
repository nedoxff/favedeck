import { type DatabaseDeck, db } from "@/src/features/storage/definition";
import { TwitterModal } from "../TwitterModal";

export default function EditDeckModal(props: {
	deck: DatabaseDeck;
	onClose: () => void;
}) {
	const [deckName, setDeckName] = useState(props.deck.name);
	const [deckSecret, setDeckSecret] = useState(props.deck.secret);
	const [deleteClicked, setDeleteClicked] = useState(false);

	return (
		<TwitterModal onClose={props.onClose}>
			<p className="font-bold text-2xl">Edit deck</p>
			<p className="opacity-75">Name:</p>
			<input
				className={`caret-fd-primary! py-2 px-4 placeholder:opacity-50! rounded-full w-full border-2 hover:border-fd-primary!`}
				placeholder="Enter deck name..."
				type="text"
				value={deckName}
				onInput={(ev) => setDeckName((ev.target as HTMLInputElement).value)}
			/>
			<div>
				<input
					id="favedeck-edit-deck-popup-secret"
					className="accent-fd-primary"
					type="checkbox"
					checked={deckSecret}
					onChange={(ev) => setDeckSecret(ev.target.checked)}
				/>
				<label className="ml-2" htmlFor="favedeck-edit-deck-popup-secret">
					Secret (hide thumbnails)
				</label>
			</div>
			<button
				onClick={async () => {
					await db.decks.update(props.deck.id, {
						name: deckName,
						secret: deckSecret,
					});
					props.onClose();
				}}
				disabled={deckName.length === 0}
				type="button"
				className="rounded-full w-full text-white font-bold bg-fd-primary! disabled:shadow-darken! hover:shadow-darken! py-2 px-4 text-center"
			>
				Save
			</button>
			<button
				onClick={async () => {
					if (!deleteClicked) {
						setDeleteClicked(true);
						return;
					}
					await db.decks.delete(props.deck.id);
					props.onClose();
				}}
				type="button"
				className="rounded-full w-full text-white font-bold bg-fd-danger! hover:shadow-lighten! py-2 px-4 text-center"
			>
				{deleteClicked ? "Are you sure?" : "Delete"}
			</button>
			<button
				onClick={props.onClose}
				type="button"
				className="rounded-full w-full text-white font-bold bg-fd-bg-lighter! hover:shadow-lighten! py-2 px-4 text-center"
			>
				Cancel
			</button>
		</TwitterModal>
	);
}
