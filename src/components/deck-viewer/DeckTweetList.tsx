import { getDeckTweets } from "@/src/features/storage/decks";
import type {
    DatabaseDeck,
    DatabaseTweet,
} from "@/src/features/storage/definition";
import { kv } from "@/src/features/storage/kv";
import { addEntitiesFromDatabaseTweets } from "@/src/internals/redux";
import { webpack } from "@/src/internals/webpack";
import { useLiveQuery } from "dexie-react-hooks";
import { mergician } from "mergician";
import { tweetComponents } from "../external/Tweet";

const patchTweetProps = (
	tweet: DatabaseTweet,
	props: Record<string, unknown>,
) => {
	const copy = mergician({}, props);
	// @ts-expect-error
	// NOTE: THE "-modified" HERE IS REALLY IMPORTANT
	copy.item.id = `tweet-${tweet.id}-modified`;
	// @ts-expect-error
	copy.item.data.entryId = `tweet-${tweet.id}`;
	// @ts-expect-error
	copy.item.data.content.id = tweet.id;
	// @ts-expect-error
	copy.item.render = () => copy.item._renderer(copy.item.data, undefined);
	// @ts-expect-error
	copy.item.data.content.displayType = "Tweet";
	// @ts-expect-error
	copy.item.data.conversationPosition = undefined;
	// @ts-expect-error
	copy.visible = true;
	// @ts-expect-error
	copy.shouldAnimate = false;
	return copy;
};

function InternalTweetList(props: {
	deck: DatabaseDeck;
	virtuoso: typeof import("react-virtuoso");
}) {
	const [tweets, setTweets] = webpack.common.react.React.useState<
		DatabaseTweet[]
	>([]);
	const [windowHeight, setWindowHeight] =
		webpack.common.react.React.useState<number>(window.innerHeight);

	webpack.common.react.React.useEffect(() => {
		getDeckTweets(props.deck.id, 0, 20).then((v) => {
			addEntitiesFromDatabaseTweets(v).then(() => setTweets(v));
		});

		const handleResize = () => setWindowHeight(window.innerHeight);
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	return webpack.common.react.React.createElement(
		tweetComponents.ContextBridge,
		{
			children: webpack.common.react.React.createElement(
				props.virtuoso.Virtuoso<DatabaseTweet>,
				{
					data: tweets,
					totalCount: tweets.length,
					itemContent: (_, tweet) =>
						webpack.common.react.React.createElement("div", {
							className: "*:static!",
							children: webpack.common.react.React.createElement(
								tweetComponents.Tweet,
								patchTweetProps(tweet, tweetComponents.defaultTweetProps),
							),
						}),
					async endReached(index) {
						const newTweets = await getDeckTweets(props.deck.id, index + 1, 20);
						await addEntitiesFromDatabaseTweets(newTweets);
						setTweets([...tweets, ...newTweets]);
					},
					useWindowScroll: true,
					increaseViewportBy: windowHeight,
				} satisfies import("react-virtuoso").VirtuosoProps<DatabaseTweet, {}>,
			),
		},
	);
}

export function DeckTweetList(props: { deck: DatabaseDeck }) {
	const tweetComponentsAvailable = useLiveQuery(
		kv.tweets.tweetComponentsAvailable.get,
	);

	const ref = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (tweetComponentsAvailable !== "true") return;

		queueMicrotask(async () => {
			if (!ref.current) return;
			const virtuoso = await import("react-virtuoso");
			const TwitterReact = webpack.common.react.React;
			const TwitterReactDOM = webpack.common.react.ReactDOM;
			const root = TwitterReactDOM.createRoot(ref.current);
			root.render(
				TwitterReact.createElement(InternalTweetList, {
					deck: props.deck,
					virtuoso,
				}),
			);
		});
	}, [tweetComponentsAvailable]);

	return <div ref={ref} className="grow" />;
}
