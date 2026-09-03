import { BlobWriter } from "@zip.js/zip.js";
import { useLiveQuery } from "dexie-react-hooks";
import type { Dispatch, SetStateAction } from "react";
import { createPortal } from "react-dom";
import { useDropzone } from "react-dropzone";
import sanitize from "sanitize-filename";
import { getDeckThumbnails } from "@/src/features/storage/decks";
import { type DatabaseDeck, db } from "@/src/features/storage/definition";
import {
	type BackupArchiveInformation,
	type BackupOptions,
	backupSystem,
	FULL_BACKUP_OPTIONS,
} from "@/src/features/storage/import-export/backup";
import { cn } from "@/src/helpers/cn";
import { getUserId } from "@/src/internals/foolproof";
import CreateIcon from "~icons/mdi/download";
import LockIcon from "~icons/mdi/lock";
import UploadIcon from "~icons/mdi/tray-arrow-up";
import RestoreIcon from "~icons/mdi/upload";
import Alert from "../common/Alert";
import Checkbox from "../common/Checkbox";
import Spinner from "../common/Spinner";
import Tabs from "../common/Tabs";
import { components } from "../wrapper";
import ConfirmModal from "./ConfirmModal";
import { TwitterModal } from "./TwitterModal";

// this is the same as the ImportDeckModalDropzone but whatever...
function BackupModalDropzone(props: { onDropped: (file: File) => void }) {
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
				"rounded-xl border-dashed cursor-pointer border-2 border-fd-border flex flex-col justify-center items-center p-4 my-2 gap-1 transition-all",
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

function BackupOptionsConfigurator(props: {
	options: BackupOptions;
	setOptions: Dispatch<SetStateAction<BackupOptions>>;
	decks: DatabaseDeck[];
	thumbnails: Record<string, string>;
	mode: "create" | "restore";
	hasKV?: boolean;
	hasPotentiallyUngrouped?: boolean;
}) {
	const groupedDecks = Object.groupBy(props.decks, (d) => d.user);
	return (
		<>
			{props.decks.length > 0 && (
				<>
					<div className="flex flex-col gap-1 max-h-80 overflow-x-hidden overflow-y-auto rounded-xl  border-fd-border border p-2">
						{Object.entries(groupedDecks).map(([, userDecks], idx) => (
							<>
								<p className="w-full text-center opacity-75">
									(User #{idx + 1})
								</p>
								{(userDecks ?? []).map((d) => {
									const toggle = () =>
										props.setOptions((current) =>
											current.exclude.decks.includes(d.id)
												? {
														...current,
														exclude: {
															...current.exclude,
															decks: current.exclude.decks.filter(
																(d1) => d.id !== d1,
															),
														},
													}
												: {
														...current,
														exclude: {
															...current.exclude,
															decks: [...current.exclude.decks, d.id],
														},
													},
										);
									return (
										<div
											onClick={toggle}
											role="button"
											key={d.id}
											className="w-full hover:shadow-lighten! focus:shadow-lighten! hover:cursor-pointer p-2 rounded-lg h-20 shrink-0 flex flex-row justify-between items-center gap-4"
										>
											<div className="flex flex-row h-full gap-4 justify-center items-center w-full min-w-0">
												<div className="h-full rounded-lg bg-fd-bg-20! aspect-square relative flex justify-center items-center">
													{d.secret ? (
														<LockIcon width={24} height={24} />
													) : d.id in props.thumbnails &&
														props.thumbnails[d.id] ? (
														<img
															src={props.thumbnails[d.id]}
															alt="deck icon"
															className="h-full rounded-lg aspect-square object-cover"
														/>
													) : undefined}
												</div>

												<div className="flex flex-col grow min-w-0">
													<p className="overflow-hidden text-ellipsis whitespace-nowrap">
														{d.name}
													</p>
												</div>
											</div>

											<Checkbox
												checked={!props.options.exclude.decks.includes(d.id)}
												onChecked={toggle}
											/>
										</div>
									);
								})}
							</>
						))}
					</div>
					{props.mode === "create" && (
						<div className="flex flex-row justify-end items-end w-full">
							<p
								className="underline cursor-pointer opacity-75"
								onClick={async () => {
									const userId = (await getUserId()) ?? "";
									props.setOptions((current) => {
										return {
											...current,
											exclude: {
												...current.exclude,
												decks: props.decks
													.filter((d) => d.user !== userId)
													.map((d) => d.id),
											},
										};
									});
								}}
							>
								Only backup current user's decks
							</p>
						</div>
					)}
				</>
			)}

			{(props.hasKV ?? true) && (
				<div className="flex flex-row gap-2 items-end">
					<Checkbox
						className="scale-75"
						checked={!props.options.exclude.kv}
						onChecked={() =>
							props.setOptions((current) => ({
								...current,
								exclude: { ...current.exclude, kv: !current.exclude.kv },
							}))
						}
					/>
					<p>Extension settings</p>
				</div>
			)}

			{(props.hasPotentiallyUngrouped ?? true) && (
				<div className="flex flex-row gap-2 items-end">
					<Checkbox
						className="scale-75"
						checked={!props.options.exclude.potentiallyUngrouped}
						onChecked={() =>
							props.setOptions((current) => ({
								...current,
								exclude: {
									...current.exclude,
									potentiallyUngrouped: !current.exclude.potentiallyUngrouped,
								},
							}))
						}
					/>
					<p>Leftover tweets ("Sort later")</p>
				</div>
			)}
		</>
	);
}

function CreateBackupTab(props: { onClose: () => void }) {
	const [isProcessing, setIsProcessing] = useState(false);
	const [error, setError] = useState<string | undefined>(undefined);
	const [options, setOptions] = useState<BackupOptions>(FULL_BACKUP_OPTIONS);

	const decks = useLiveQuery(() => db.decks.toArray(), [], []);
	const thumbnails = useLiveQuery(
		async () => {
			if (!decks || !decks.length) return {};
			const result: Record<string, string> = {};
			for (const deck of decks) {
				const thumb = await getDeckThumbnails(deck.id, 1);
				if (thumb.length) result[deck.id] = thumb[0];
			}
			return result;
		},
		[decks],
		{} as Record<string, string>,
	);

	return (
		<>
			{error && (
				<Alert
					type="error"
					title={
						<p className="text-lg font-semibold">Failed to create backup</p>
					}
					description={<p className="font-mono">{error}</p>}
				/>
			)}

			{!isProcessing && (
				<>
					<BackupOptionsConfigurator
						decks={decks}
						thumbnails={thumbnails}
						options={options}
						setOptions={setOptions}
						mode="create"
					/>

					<hr className="border-t border-fd-border" />

					<Alert
						type="info"
						title={<p className="text-lg font-semibold">Note</p>}
						description={
							<p className="leading-none">
								Backups are intended for saving <i>everything</i> the extension
								could possibly store, meaning that one backup may contain
								information from multiple accounts.
							</p>
						}
					/>
				</>
			)}

			<button
				onClick={() => {
					setIsProcessing(true);
					setError(undefined);

					console.time("create backup");
					const writer = new BlobWriter();
					backupSystem.create(options, writer).then((result) => {
						console.timeEnd("create backup");
						if (result.isOk()) {
							writer.getData().then((blob) => {
								const a = document.createElement("a");
								const url = URL.createObjectURL(blob);
								a.href = url;
								a.download = sanitize(`backup-${Date.now()}.zip`);
								a.click();
								URL.revokeObjectURL(url);
							});
							props.onClose();
							components.Toast.success(`Successfully created a backup!`);
							return;
						}

						console.error("failed to create a backup", result.error);
						setIsProcessing(false);
						setError(result.error.message);
					});
				}}
				disabled={isProcessing}
				type="button"
				className="flex justify-center items-center rounded-full w-full text-white font-bold bg-fd-primary! disabled:shadow-darken! hover:shadow-darken! py-2 px-4 text-center! cursor-pointer disabled:cursor-not-allowed"
			>
				{isProcessing ? (
					<Spinner
						size="small"
						className="border-[rgba(255,255,255,0.25)]! border-b-white!"
					/>
				) : (
					"Create!"
				)}
			</button>
			<button
				onClick={props.onClose}
				type="button"
				className="rounded-full w-full text-fd-fg font-bold bg-fd-bg-15! hover:shadow-lighten! py-2 px-4 text-center! cursor-pointer"
			>
				Cancel
			</button>
		</>
	);
}

function RestoreBackupTab(props: { onClose: () => void }) {
	const [isProcessing, setIsProcessing] = useState(false);
	const [error, setError] = useState<string | undefined>(undefined);
	const [options, setOptions] = useState<BackupOptions>(FULL_BACKUP_OPTIONS);
	const [showConfirmModal, setShowConfirmModal] = useState(false);

	const [file, setFile] = useState<File | undefined>(undefined);
	const [info, setInfo] = useState<BackupArchiveInformation | undefined>(
		undefined,
	);

	const restore = useCallback(() => {
		if (!file) return;
		setIsProcessing(true);
		setError(undefined);
		console.time(`restore backup from ${file.name}`);
		backupSystem.restore(file, options).then((result) => {
			console.timeEnd(`restore backup from ${file.name}`);
			setIsProcessing(false);
			if (result.isOk()) {
				props.onClose();
				components.Toast.success(`Successfully restored the backup!`);
			} else {
				console.error("failed to restore a backup", result.error);
				setError(`${result.error}`);
			}
		});
	}, [file]);

	return (
		<>
			{!isProcessing && !info && (
				<BackupModalDropzone
					onDropped={(file) => {
						setIsProcessing(true);
						console.time(`analyze backup archive from ${file.name}`);
						backupSystem.analyze(file).then((result) => {
							console.timeEnd(`analyze backup archive from ${file.name}`);
							setIsProcessing(false);
							if (result.isErr()) {
								console.error("failed to analyze backup archive", result.error);
								setError(`${result.error}`);
								return;
							}

							setFile(file);
							setInfo(result.value);
							setError(undefined);
						});
					}}
				/>
			)}

			{isProcessing && !info && (
				<div className="py-4 px-2 flex justify-center items-center">
					<Spinner />
				</div>
			)}

			{!isProcessing && info && (
				<>
					<BackupOptionsConfigurator
						decks={info.decks}
						thumbnails={{}}
						options={options}
						setOptions={setOptions}
						hasKV={info.containsKV}
						hasPotentiallyUngrouped={info.containsPotentiallyUngrouped}
						mode="restore"
					/>

					<hr className="border-t border-fd-border" />

					<Alert
						type="info"
						title={<p className="text-lg font-semibold">Note</p>}
						description={
							<p>
								Restoring a backup will overwrite settings and restore decks
								which have been previously deleted.
								<br />
								<b>
									At the moment, backups created by one user cannot be restored
									by a different user.
								</b>
							</p>
						}
					/>
				</>
			)}

			{error && (
				<Alert
					type="error"
					title={
						<p className="text-lg font-semibold">
							Failed to {info ? "restore backup" : "analyze backup archive"}
						</p>
					}
					description={<p className="font-mono">{error}</p>}
				/>
			)}

			{info && (
				<button
					onClick={() => {
						if (!file) return;
						if (info.sameUser) restore();
						else setShowConfirmModal(true);
					}}
					disabled={isProcessing}
					type="button"
					className="flex justify-center items-center rounded-full w-full text-white font-bold bg-fd-primary! disabled:shadow-darken! hover:shadow-darken! py-2 px-4 text-center! cursor-pointer disabled:cursor-not-allowed"
				>
					{isProcessing ? (
						<Spinner
							size="small"
							className="border-[rgba(255,255,255,0.25)]! border-b-white!"
						/>
					) : (
						"Restore!"
					)}
				</button>
			)}
			<button
				onClick={props.onClose}
				type="button"
				className="rounded-full w-full text-fd-fg font-bold bg-fd-bg-15! hover:shadow-lighten! py-2 px-4 text-center! cursor-pointer"
			>
				Cancel
			</button>

			{showConfirmModal &&
				createPortal(
					<ConfirmModal
						title="Warning!"
						description={
							<>
								This backup was created by a different user and may cause the
								extension to behave weirdly if you try to restore it anyway.
								<br />
								<b>
									It is highly recommended not to restore it; only do it if you
									absolutely know what you're doing (e.g. having multiple
									accounts in one browser)
								</b>
								<br />
								This is a requested feature that will probably become supported
								in future versions.
							</>
						}
						confirmIsDangerous
						confirmText="I understand the risks and potential consequences of my actions and wish to restore this backup anyway"
						onCancelled={() => setShowConfirmModal(false)}
						onConfirmed={() => {
							setShowConfirmModal(false);
							restore();
						}}
						className="w-xl"
					/>,
					document.body,
				)}
		</>
	);
}

export default function BackupModal(props: { onClose: () => void }) {
	const [tab, setTab] = useState<"create" | "restore">("create");

	return (
		<TwitterModal onClose={props.onClose} className="w-lg">
			<Tabs
				classNames={{ tab: "rounded-xl" }}
				state={tab}
				onUpdate={setTab}
				tabs={[
					{
						key: "create",
						icon: <CreateIcon width={24} height={24} />,
						text: "Create backup",
					},
					{
						key: "restore",
						icon: <RestoreIcon width={24} height={24} />,
						text: "Restore backup",
					},
				]}
			/>

			{tab === "create" ? (
				<CreateBackupTab onClose={props.onClose} />
			) : (
				<RestoreBackupTab onClose={props.onClose} />
			)}
		</TwitterModal>
	);
}
