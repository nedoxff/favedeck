import { get, set } from "idb-keyval";
import { messenger } from "@/src/helpers/messaging/extension";
import { sendToContent } from "@/src/helpers/messaging/utils";
import { AUTO_BACKUP_CHUNK_SIZE } from "./writer";

export interface AutoBackupEvents {
	requestTimestamp: Record<string, never>;
	requestBackup: Record<string, never>;
	begin: Record<string, never>;
	chunk: Array<number>;
	end: Record<string, never>;
}
export interface AutoBackupResponseEvents {
	receiveTimestamp: number;
	begin: Record<string, never>;
	chunk: Array<number>;
	end: Record<string, never>;
}

export type AutoBackupMessage = {
	[K in keyof AutoBackupEvents]: { type: K; data: AutoBackupEvents[K] };
}[keyof AutoBackupEvents];
export type AutoBackupResponseMessage = {
	[K in keyof AutoBackupResponseEvents]: {
		type: K;
		data: AutoBackupResponseEvents[K];
	};
}[keyof AutoBackupResponseEvents];

export interface AutoBackup {
	handleMessage: (message: AutoBackupMessage) => Promise<void>;
}

export const AUTO_BACKUP_TIMESTAMP_KEY = "autoBackupTimestamp";
export const AUTO_BACKUP_DATA_KEY = "autoBackupData";

export const autoBackup: AutoBackup = (() => {
	let chunks: Uint8Array[] = [];
	return {
		async handleMessage(message) {
			switch (message.type) {
				case "requestTimestamp": {
					const timestamp =
						(await get<number>(AUTO_BACKUP_TIMESTAMP_KEY)) ?? -1;
					await sendToContent((tab) =>
						messenger.sendMessage(
							"autoBackup:forward",
							{ type: "receiveTimestamp", data: timestamp },
							tab,
						),
					);
					break;
				}
				case "requestBackup": {
					const data = await get<Blob>(AUTO_BACKUP_DATA_KEY);
					if (!data) return;

					const tabs = await browser.tabs.query({
						url: ["*://*.x.com/*", "*://*.twitter.com/*"],
					});
					const broadcast = async (message: AutoBackupResponseMessage) => {
						for (const tab of tabs)
							await messenger.sendMessage(
								"autoBackup:forward",
								message,
								tab.id,
							);
					};

					await broadcast({ type: "begin", data: {} });
					let start = 0;
					while (start < data.size) {
						const end = Math.min(start + AUTO_BACKUP_CHUNK_SIZE, data.size);
						const chunk = data.slice(start, end);
						await broadcast({
							type: "chunk",
							data: Array.from(await chunk.bytes()),
						});
						start = end;
					}
					await broadcast({ type: "end", data: {} });
					break;
				}
				case "begin": {
					chunks = [];
					console.log("beginning auto backup reception");
					break;
				}
				case "chunk": {
					chunks.push(Uint8Array.from(message.data));
					console.log("received chunk");
					break;
				}
				case "end": {
					const blob = new Blob(chunks as BlobPart[]);
					await set(AUTO_BACKUP_DATA_KEY, blob);
					await set(AUTO_BACKUP_TIMESTAMP_KEY, Date.now());
					console.log("successfully received backup archive at", Date.now());
					break;
				}
			}
		},
	};
})();
