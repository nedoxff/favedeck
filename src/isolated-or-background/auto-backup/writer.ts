import { Writer } from "@zip.js/zip.js";
import { websiteMessenger } from "@/src/helpers/messaging/content";

export class ForwarderWriter extends Writer<void> {
	async writeUint8Array(array: Uint8Array): Promise<void> {
		await websiteMessenger.sendMessage("autoBackup:forward", {
			type: "chunk",
			data: Array.from(array),
		});
	}
}
