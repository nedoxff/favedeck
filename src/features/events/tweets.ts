import { tweetComponents } from "@/src/components/external/Tweet";
import { TypedEventTarget } from "typescript-event-target";

interface TweetsEventMap {
	"components-available": Event;
	"tweet-bookmarked": CustomEvent<string>;
	"tweet-unbookmarked": CustomEvent<string>;
}

class TweetsEventTarget extends TypedEventTarget<TweetsEventMap> {
	public dispatchComponentsAvailable() {
		tweetComponents.meta.available = true;
		this.dispatchTypedEvent(
			"components-available",
			new Event("components-available"),
		);
	}

	public dispatchTweetBookmarked(id: string) {
		this.dispatchTypedEvent(
			"tweet-bookmarked",
			new CustomEvent("tweet-bookmarked", { detail: id }),
		);
	}

	public dispatchTweetUnbookmarked(id: string) {
		this.dispatchTypedEvent(
			"tweet-unbookmarked",
			new CustomEvent("tweet-unbookmarked", { detail: id }),
		);
	}
}

export const tweetsEventTarget = new TweetsEventTarget();
