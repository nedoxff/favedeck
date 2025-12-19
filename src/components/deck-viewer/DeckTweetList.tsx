import { getDeckSize, getDeckTweets } from "@/src/features/storage/decks";
import type {
	DatabaseDeck,
	DatabaseTweet,
} from "@/src/features/storage/definition";
import { kv } from "@/src/features/storage/kv";
import {
	convertDatabaseTweetToMasonryInfos,
	type TweetMasonryInfo,
} from "@/src/internals/goodies";
import { addEntitiesFromDatabaseTweets } from "@/src/internals/redux";
import { useLiveQuery } from "dexie-react-hooks";
import { Masonry, useInfiniteLoader } from "masonic";
import { mergician } from "mergician";
import { Virtuoso } from "react-virtuoso";
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

export function DeckMasonryList(props: { deck: DatabaseDeck }) {
	const tweetComponentsAvailable = useLiveQuery(
		kv.tweets.tweetComponentsAvailable.get,
	);
	const deckSize = useLiveQuery(() => getDeckSize(props.deck.id));
	const [tweets, setTweets] = useState<TweetMasonryInfo[]>([]);

	useEffect(() => {
		(async () => {
			const tweets = await getDeckTweets(props.deck.id, 0, 20);
			await addEntitiesFromDatabaseTweets(tweets);
			setTweets(tweets.flatMap((t) => convertDatabaseTweetToMasonryInfos(t)));
		})();
	}, []);

	const maybeLoadMore = useInfiniteLoader(
		async (start, stop) => {
			console.log(start, stop);
			const newTweets = await getDeckTweets(
				props.deck.id,
				start,
				stop - start + 1,
			);
			await addEntitiesFromDatabaseTweets(newTweets);
			setTweets((current) => [
				...current,
				...newTweets.flatMap((t) => convertDatabaseTweetToMasonryInfos(t)),
			]);
		},
		{
			isItemLoaded: (index, items) => !!items[index],
			threshold: 2,
			totalItems: deckSize ?? 0,
		},
	);

	// note: thank your past self for implementing react proxies.
	return (
		<div className="grow p-4">
			{tweetComponentsAvailable === "true" && (
				<tweetComponents.ContextBridge>
					<Masonry
						onRender={maybeLoadMore}
						items={tweets}
						columnGutter={8}
						rowGutter={8}
						columnCount={2}
						render={({ index, width, data }) => (
							<div
								style={{ width: `${width}px` }}
								className="rounded-2xl overflow-hidden relative group"
							>
								<img
									key={`${data.id}-${index}`}
									src={data.info.url}
									width={data.info.width}
									height={data.info.height}
									alt="meow"
								/>
								<img
									className="absolute aspect-square rounded-full bottom-2 left-2 z-20 w-9"
									src={data.authorProfileImage}
									alt="pfp"
									style={{
										filter: "drop-shadow(rgba(0, 0, 0, 0.35) 0 0 10px)",
									}}
								/>
								<div className="absolute w-full h-full top-0 left-0 z-10 group-hover:flex! rounded-2xl hidden bg-black/25"></div>
							</div>
						)}
					/>
				</tweetComponents.ContextBridge>
			)}
		</div>
	);
}

export function DeckTweetList(props: { deck: DatabaseDeck }) {
	const tweetComponentsAvailable = useLiveQuery(
		kv.tweets.tweetComponentsAvailable.get,
	);
	const [tweets, setTweets] = useState<DatabaseTweet[]>([]);
	const [windowHeight, setWindowHeight] = useState<number>(window.innerHeight);

	useEffect(() => {
		getDeckTweets(props.deck.id, 0, 20).then((v) => {
			addEntitiesFromDatabaseTweets(v).then(() => setTweets(v));
		});

		const handleResize = () => setWindowHeight(window.innerHeight);
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	// note: thank your past self for implementing react proxies.
	return (
		<div className="grow">
			{tweetComponentsAvailable === "true" && (
				<tweetComponents.ContextBridge>
					<Virtuoso<DatabaseTweet>
						data={tweets}
						useWindowScroll
						increaseViewportBy={windowHeight}
						endReached={async (index) => {
							const newTweets = await getDeckTweets(
								props.deck.id,
								index + 1,
								20,
							);
							await addEntitiesFromDatabaseTweets(newTweets);
							setTweets([...tweets, ...newTweets]);
						}}
						totalCount={tweets.length}
						itemContent={(_, tweet) => (
							<div className="*:static!">
								<tweetComponents.Tweet
									{...patchTweetProps(tweet, tweetComponents.defaultTweetProps)}
								/>
							</div>
						)}
					/>
				</tweetComponents.ContextBridge>
			)}
		</div>
	);
}
