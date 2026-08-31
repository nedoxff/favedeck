import { createPortal } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { internalsEventTarget } from "../features/events/internals";
import {
	backupSystem,
	FULL_BACKUP_OPTIONS,
} from "../features/storage/import-export/backup";
import { kv } from "../features/storage/kv";
import { formatTimeAgo } from "../helpers/date";
import { websiteMessenger } from "../helpers/messaging/content";
import type { AutoBackupResponseMessage } from "../isolated-or-background/auto-backup/root";
import { ForwarderWriter } from "../isolated-or-background/auto-backup/writer";
import Spinner from "./common/Spinner";
import { TwitterModal } from "./modals/TwitterModal";
import { components } from "./wrapper";

function InternalBackupDetectedModal(props: { timestamp: number }) {
	const [processingState, setProcessingState] = useState<string | undefined>(
		undefined,
	);

	const receiveAndApplyBackup = async () => {
		setProcessingState("Preparing");

		const chunks: Uint8Array[] = [];
		const messageListener = (event: CustomEvent<AutoBackupResponseMessage>) => {
			switch (event.detail.type) {
				case "receiveTimestamp": {
					break;
				}
				case "begin": {
					setProcessingState("Receiving backup chunks");
					break;
				}
				case "chunk": {
					chunks.push(Uint8Array.from(event.detail.data));
					break;
				}
				case "end": {
					setProcessingState("Restoring backup");
					const blob = new Blob(chunks as BlobPart[]);
					backupSystem.restore(blob, FULL_BACKUP_OPTIONS).then((result) => {
						if (result.isOk())
							components.Toast.success("Successfully restored backup!");
						else
							components.Toast.error("Failed to restore backup!", result.error);

						internalsEventTarget.removeEventListener(
							"auto-backup-message",
							messageListener,
						);
						BackupDetectedModal.hide();
					});
					break;
				}
			}
		};

		internalsEventTarget.addEventListener(
			"auto-backup-message",
			messageListener,
		);
		await websiteMessenger.sendMessage("autoBackup:forward", {
			type: "requestBackup",
			data: {},
		});
	};

	return createPortal(
		<TwitterModal
			className="max-w-lg"
			onClose={() => BackupDetectedModal.hide()}
		>
			{!processingState && (
				<>
					<p className="font-bold text-2xl">Backup detected</p>
					<p className="opacity-75">
						There seems to be a backup that was created{" "}
						<b>{formatTimeAgo(new Date(props.timestamp))}</b>. It is recommended
						to restore it to avoid data loss.
					</p>
					<button
						type="button"
						onClick={() => receiveAndApplyBackup()}
						className="rounded-full w-full bg-fd-primary! text-white font-bold disabled:shadow-darken! hover:shadow-darken! py-2 px-4 text-center! cursor-pointer"
					>
						Restore backup
					</button>
					<button
						onClick={() => BackupDetectedModal.hide()}
						type="button"
						className="rounded-full w-full text-fd-fg font-bold bg-fd-danger! hover:shadow-lighten! py-2 px-4 text-center! cursor-pointer"
					>
						Do not restore backup
					</button>
				</>
			)}

			{processingState && (
				<div className="flex flex-col gap-2 justify-center items-center">
					<Spinner size="large" />
					<p className="font-bold text-xl">{processingState}</p>
				</div>
			)}
		</TwitterModal>,
		document.body,
	);
}

export const BackupDetectedModal = (() => {
	let root: Root | undefined;
	let container: HTMLDivElement | undefined;
	let lastTimestamp: number | undefined;

	return {
		show(timestamp) {
			lastTimestamp = timestamp;
			container = document.createElement("div");
			container.classList.add("favedeck-root");
			document.body.append(container);
			root = createRoot(container);
			root.render(<InternalBackupDetectedModal timestamp={timestamp} />);
		},
		hide() {
			if (!root || !container || !lastTimestamp) return;
			kv.lastBackupTimestamp.set(lastTimestamp);
			root.unmount();
			root = undefined;
			container.remove();
			container = undefined;
		},
		async performAutoBackup() {
			console.log("performing auto-backup");
			await websiteMessenger.sendMessage("autoBackup:forward", {
				type: "begin",
				data: {},
			});
			const result = await backupSystem.create(
				FULL_BACKUP_OPTIONS,
				new ForwarderWriter(),
			);
			await websiteMessenger.sendMessage("autoBackup:forward", {
				type: "end",
				data: {},
			});
			if (result.isOk()) console.log("successfully performed auto-backup");
			else {
				console.error("failed to perform auto-backup", result.error);
				components.Toast.error("Failed to perform auto-backup", result.error);
			}
		},
	} satisfies {
		show: (timestamp: number) => void;
		hide: () => void;
		performAutoBackup: () => Promise<void>;
	};
})();
