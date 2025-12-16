import { createDeck } from "@/src/features/storage/decks";
import { kv } from "@/src/features/storage/kv";
import { TwitterModal } from "../TwitterModal";

export default function CreateDeckModal(props: { onClose: () => void }) {
	const [deckName, setDeckName] = useState("");
	const [deckSecret, setDeckSecret] = useState(false);

	return (
		<TwitterModal onClose={props.onClose}>
			<p className="font-bold text-2xl">New deck</p>
			<p className="opacity-75">Enter the name for your new deck:</p>
			<input
				className={`caret-fd-primary! py-2 px-4 placeholder:opacity-50! rounded-full w-full border-2 hover:border-fd-primary!`}
				placeholder="Enter deck name..."
				type="text"
				value={deckName}
				onInput={(ev) => setDeckName((ev.target as HTMLInputElement).value)}
			/>
			<div>
				<input
					id="favedeck-select-deck-popup-secret"
					className="accent-fd-primary"
					type="checkbox"
					checked={deckSecret}
					onChange={(ev) => setDeckSecret(ev.target.checked)}
				/>
				<label className="ml-2" htmlFor="favedeck-select-deck-popup-secret">
					Secret (hide thumbnails)
				</label>
			</div>
			<button
				onClick={async () => {
					props.onClose();
					const id = await createDeck(deckName, deckSecret);
					await kv.decks.newDeck.set(id);
				}}
				disabled={deckName.length === 0}
				type="button"
				className="rounded-full w-full text-white font-bold bg-fd-primary! disabled:shadow-darken! hover:shadow-darken! py-2 px-4 text-center"
			>
				Create
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
