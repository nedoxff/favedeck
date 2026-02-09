import { useLiveQuery } from "dexie-react-hooks";
import sanitize from "sanitize-filename";
import { getDeckSize } from "@/src/features/storage/decks";
import type { DatabaseDeck } from "@/src/features/storage/definition";
import { deckImporterExporter } from "@/src/features/storage/import-export/decks";
import Alert from "../common/Alert";
import Spinner from "../common/Spinner";
import { TwitterModal } from "./TwitterModal";

export default function ExportDeckModal(props: {
	deck: DatabaseDeck;
	onClose: () => void;
}) {
	const [isExporting, setIsExporting] = useState(false);
	const [error, setError] = useState<string | undefined>(undefined);
	const deckSize = useLiveQuery(() => getDeckSize(props.deck.id));

	return (
		<TwitterModal onClose={props.onClose} className="max-w-lg">
			<p className="font-bold text-2xl">Export deck</p>
			<p className="opacity-75">
				<b>
					Note: at the moment, exporting & importing decks is only supported for
					the same account.
				</b>
			</p>
			<p>
				Are you sure you want to export <b>{props.deck.name}</b> with {deckSize}{" "}
				tweet
				{deckSize === 1 ? "" : "s"}?
			</p>

			{error && (
				<Alert
					type="error"
					title={<p className="text-lg font-semibold">Failed to export deck</p>}
					description={<p className="font-mono">{error}</p>}
				/>
			)}

			<button
				onClick={() => {
					setIsExporting(true);
					setError(undefined);

					console.time(`export deck ${props.deck.name} (${props.deck.id})`);
					deckImporterExporter.export(props.deck.id).then((result) => {
						console.timeEnd(
							`export deck ${props.deck.name} (${props.deck.id})`,
						);
						if (result.isOk()) {
							const a = document.createElement("a");
							const url = URL.createObjectURL(result.value);
							const sanitizedName = sanitize(`${props.deck.name}.zip`);
							a.href = url;
							a.download =
								sanitizedName.length === 0
									? `${props.deck.id}.zip`
									: sanitizedName;
							a.click();
							URL.revokeObjectURL(url);
							props.onClose();
							return;
						}

						console.error(
							"failed to export deck",
							props.deck.name,
							"(",
							props.deck.id,
							")",
							result.error,
						);
						setIsExporting(false);
						setError(result.error.message);
					});
				}}
				disabled={isExporting}
				type="button"
				className="mt-2 flex justify-center items-center rounded-full w-full text-white font-bold bg-fd-primary! disabled:shadow-darken! hover:shadow-darken! py-2 px-4 text-center"
			>
				{isExporting ? (
					<Spinner
						size="small"
						className="border-[rgba(255,255,255,0.25)]! border-b-white!"
					/>
				) : (
					"Export!"
				)}
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
