import { TypedEventTarget } from "typescript-event-target";

interface InternalsEventMap {
	"bookmarks-timeline-fetched": Event;
}

class InternalsEventTarget extends TypedEventTarget<InternalsEventMap> {
	public dispatchBookmarksTimelineFetched() {
		this.dispatchTypedEvent(
			"bookmarks-timeline-fetched",
			new Event("bookmarks-timeline-fetched"),
		);
	}
}

export const internalsEventTarget = new InternalsEventTarget();
