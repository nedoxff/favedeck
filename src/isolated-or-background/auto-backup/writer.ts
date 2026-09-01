import { Writer } from "@zip.js/zip.js";
import { websiteMessenger } from "@/src/helpers/messaging/content";

export const AUTO_BACKUP_CHUNK_SIZE = 1024 * 1024; // mb
export class ForwarderWriter extends Writer<void> {
	private lastChunk: Uint8Array = new Uint8Array(AUTO_BACKUP_CHUNK_SIZE);
	private lastChunkSize: number = 0;

	async writeUint8Array(array: Uint8Array) {
		let written = 0;
		while (written < array.length) {
			const left = AUTO_BACKUP_CHUNK_SIZE - this.lastChunkSize;
			const toCopy = Math.min(left, array.length - written);

			this.lastChunk.set(
				array.subarray(written, written + toCopy),
				this.lastChunkSize,
			);
			this.lastChunkSize += toCopy;
			written += toCopy;

			if (this.lastChunkSize === AUTO_BACKUP_CHUNK_SIZE) {
				await this.sendChunk(this.lastChunk);
				this.lastChunk = new Uint8Array(AUTO_BACKUP_CHUNK_SIZE);
				this.lastChunkSize = 0;
			}
		}
	}

	async flush() {
		if (this.lastChunkSize === 0) return;
		await this.sendChunk(this.lastChunk.subarray(0, this.lastChunkSize));
	}

	private async sendChunk(chunk: Uint8Array) {
		await websiteMessenger.sendMessage("autoBackup:forward", {
			type: "chunk",
			data: Array.from(chunk),
		});
	}
}
