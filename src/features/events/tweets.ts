import { tweetComponents } from "@/src/components/external/Tweet";
import { TypedEventTarget } from "typescript-event-target";

interface TweetsEventMap {
	"components-available": Event;
	"tweet-bookmarked": CustomEvent<string>;
	"tweet-unbookmarked": CustomEvent<string>;
	"tweet-decked": CustomEvent<{ tweet: string; deck: string }>;
	"tweet-undecked": CustomEvent<{ tweet: string; deck: string }>;
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

	public dispatchTweetDecked(tweet: string, deck: string) {
		this.dispatchTypedEvent(
			"tweet-decked",
			new CustomEvent("tweet-decked", {
				detail: {
					tweet,
					deck,
				},
			}),
		);
	}

	public dispatchTweetUndecked(tweet: string, deck: string) {
		this.dispatchTypedEvent(
			"tweet-undecked",
			new CustomEvent("tweet-undecked", {
				detail: {
					tweet,
					deck,
				},
			}),
		);
	}
}

export const tweetsEventTarget = new TweetsEventTarget();
