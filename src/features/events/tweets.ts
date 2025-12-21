import { tweetComponents } from "@/src/components/external/Tweet";
import { TypedEventTarget } from "typescript-event-target";

interface TweetsEventMap {
	"components-available": Event;
}

class TweetsEventTarget extends TypedEventTarget<TweetsEventMap> {
	public dispatchComponentsAvailable() {
		tweetComponents.meta.available = true;
		this.dispatchTypedEvent(
			"components-available",
			new Event("components-available"),
		);
	}
}

export const tweetsEventTarget = new TweetsEventTarget();
