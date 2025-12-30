import MasonryViewGraphic from "@/public/img/masonry-view.svg?react";
import RegularViewGraphic from "@/public/img/regular-view.svg?react";
import { type DatabaseDeck, db } from "@/src/features/storage/definition";
import { TwitterModal } from "./TwitterModal";

export default function EditDeckModal(props: {
	deck: DatabaseDeck;
	onClose: () => void;
}) {
	const [deckName, setDeckName] = useState(props.deck.name);
	const [deckSecret, setDeckSecret] = useState(props.deck.secret);
	const [deckViewMode, setDeckViewMode] = useState<"regular" | "masonry">(
		props.deck.viewMode,
	);

	return (
		<TwitterModal onClose={props.onClose}>
			<p className="font-bold text-2xl">Edit deck</p>
			<p className="opacity-75">Name</p>
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
			<p className="opacity-75">View mode</p>
			<div className="flex flex-row gap-2 w-full">
				<div className="grow h-full">
					<input
						type="radio"
						id="favedeck-edit-deck-popup-regular-view"
						name="view-mode"
						value="regular"
						className="hidden peer"
						checked={deckViewMode === "regular"}
						onChange={(ev) =>
							setDeckViewMode(ev.target.value as typeof deckViewMode)
						}
					/>
					<label
						htmlFor="favedeck-edit-deck-popup-regular-view"
						className="flex flex-col h-full gap-2 w-72 justify-start items-center p-4 border border-fd-bg-15 rounded-xl cursor-pointer peer-checked:[&_svg]:text-fd-primary! peer-checked:border-fd-primary!"
					>
						<RegularViewGraphic className="text-fd-bg-25 bg-fd-bg-15 rounded-lg w-full h-auto" />
						<p className="leading-none">
							<span className="font-bold text-xl">Regular</span>
							<br />
							<span className="opacity-75 text-sm">
								How you usually browse Twitter.
								<br />
								Great for text, not so much for images.
							</span>
						</p>
					</label>
				</div>
				<div className="grow h-full">
					<input
						type="radio"
						id="favedeck-edit-deck-popup-masonry-view"
						name="view-mode"
						value="masonry"
						className="hidden peer"
						checked={deckViewMode === "masonry"}
						onChange={(ev) =>
							setDeckViewMode(ev.target.value as typeof deckViewMode)
						}
					/>
					<label
						htmlFor="favedeck-edit-deck-popup-masonry-view"
						className="flex flex-col h-full gap-2 w-72 justify-center items-start p-4 border border-fd-bg-15 rounded-xl cursor-pointer peer-checked:[&_svg]:text-fd-primary! peer-checked:border-fd-primary!"
					>
						<MasonryViewGraphic className="text-fd-bg-25 bg-fd-bg-15 rounded-lg w-full h-auto" />
						<p className="leading-none">
							<span className="font-bold text-xl">Masonry</span>
							<br />
							<span className="opacity-75 text-sm">
								Similar to Pinterest.
								<br />
								Great for images, won't display text-only tweets.
							</span>
						</p>
					</label>
				</div>
			</div>
			<button
				onClick={async () => {
					await db.decks.update(props.deck.id, {
						name: deckName,
						secret: deckSecret,
						viewMode: deckViewMode,
						dateModified: new Date(),
					});
					props.onClose();
				}}
				disabled={deckName.length === 0}
				type="button"
				className="mt-2 rounded-full w-full text-white font-bold bg-fd-primary! disabled:shadow-darken! hover:shadow-darken! py-2 px-4 text-center"
			>
				Save
			</button>
			<button
				onClick={props.onClose}
				type="button"
				className="rounded-full w-full text-white font-bold bg-fd-bg-15! hover:shadow-lighten! py-2 px-4 text-center"
			>
				Cancel
			</button>
		</TwitterModal>
	);
}
