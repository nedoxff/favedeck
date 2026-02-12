import { useDropzone } from "react-dropzone";
import { deckImporterExporter } from "@/src/features/storage/import-export/decks";
import { cn } from "@/src/helpers/cn";
import UploadIcon from "~icons/mdi/tray-arrow-up";
import Alert from "../common/Alert";
import Spinner from "../common/Spinner";
import { components } from "../wrapper";
import { TwitterModal } from "./TwitterModal";

function ImportDeckModalDropzone(props: { onDropped: (file: File) => void }) {
	const {
		getRootProps,
		getInputProps,
		isDragActive,
		isDragAccept,
		isDragReject,
	} = useDropzone({
		accept: {
			"application/zip": [".zip"],
			"application/x-zip-compressed": [".zip"],
		},
		multiple: false,
		onDropAccepted: (files) => props.onDropped(files.at(0) as File),
	});
	return (
		<div
			{...getRootProps()}
			className={cn(
				"rounded-xl border-dashed cursor-pointer border-2 flex flex-col justify-center items-center p-4 my-2 gap-1 transition-all",
				isDragActive && isDragAccept && "border-fd-primary!",
				isDragActive && isDragReject && "border-fd-danger!",
			)}
		>
			<input {...getInputProps()}></input>
			<UploadIcon width={48} height={48} />
			<p>Drag & drop a file here or click</p>
		</div>
	);
}

export default function ImportDeckModal(props: { onClose: () => void }) {
	const [isImporting, setIsImporting] = useState(false);
	const [error, setError] = useState<string | undefined>(undefined);

	return (
		<TwitterModal onClose={props.onClose} className="max-w-lg">
			<p className="font-bold text-2xl">Import deck</p>
			<p className="opacity-75">
				<b>
					Note: at the moment, exporting & importing decks is only supported for
					the same account.
				</b>
			</p>

			{!isImporting && (
				<ImportDeckModalDropzone
					onDropped={(file) => {
						setIsImporting(true);
						console.time(`import deck from ${file.name}`);
						deckImporterExporter.import(file).then((result) => {
							console.timeEnd(`import deck from ${file.name}`);
							setIsImporting(false);
							if (result.isOk()) {
								props.onClose();
								components.Toast.success(
									`Successfully imported "${result.value.name}"`,
								);
							} else setError(`${result.error}`);
						});
					}}
				/>
			)}

			{isImporting && (
				<div className="py-4 px-2 flex justify-center items-center">
					<Spinner />
				</div>
			)}

			{error && (
				<Alert
					type="error"
					title={<p className="text-lg font-semibold">Failed to import deck</p>}
					description={<p className="font-mono">{error}</p>}
				/>
			)}

			<button
				onClick={props.onClose}
				type="button"
				className="rounded-full w-full text-fd-fg font-bold bg-fd-bg-15! hover:shadow-lighten! py-2 px-4 text-center"
			>
				Cancel
			</button>
		</TwitterModal>
	);
}
