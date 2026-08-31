import { TypedEventTarget } from "typescript-event-target";
import { tweetComponents } from "@/src/components/external/Tweet";

interface TweetsEventMap {
	"components-available": Event;
	"tweet-interacted": CustomEvent<{
		tweet: string;
		category: "bookmarks" | "likes";
	}>;
	"tweet-uninteracted": CustomEvent<{
		tweet: string;
		category: "bookmarks" | "likes";
	}>;
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

	public dispatchTweetInteracted(id: string, category: "bookmarks" | "likes") {
		this.dispatchTypedEvent(
			"tweet-interacted",
			new CustomEvent("tweet-interacted", { detail: { tweet: id, category } }),
		);
	}

	public dispatchTweetUninteracted(
		id: string,
		category: "bookmarks" | "likes",
	) {
		this.dispatchTypedEvent(
			"tweet-uninteracted",
			new CustomEvent("tweet-uninteracted", {
				detail: { tweet: id, category },
			}),
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
