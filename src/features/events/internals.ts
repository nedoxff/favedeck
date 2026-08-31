import { TypedEventTarget } from "typescript-event-target";
import type { AutoBackupResponseMessage } from "@/src/isolated-or-background/auto-backup/root";

interface InternalsEventMap {
	"timeline-fetched": Event;
	"tweet-sorted": CustomEvent<string>;
	"auto-backup-message": CustomEvent<AutoBackupResponseMessage>;
}

class InternalsEventTarget extends TypedEventTarget<InternalsEventMap> {
	public dispatchTimelineFetched() {
		this.dispatchTypedEvent("timeline-fetched", new Event("timeline-fetched"));
	}

	public dispatchTweetSorted(id: string) {
		this.dispatchTypedEvent(
			"tweet-sorted",
			new CustomEvent("tweet-sorted", { detail: id }),
		);
	}

	public dispatchAutoBackupMessage(message: AutoBackupResponseMessage) {
		this.dispatchTypedEvent(
			"auto-backup-message",
			new CustomEvent("auto-backup-message", { detail: message }),
		);
	}
}

export const internalsEventTarget = new InternalsEventTarget();
