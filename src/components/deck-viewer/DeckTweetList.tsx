import { tweetsEventTarget } from "@/src/features/events/tweets";
import { getDeckSize, getDeckTweets } from "@/src/features/storage/decks";
import type {
	DatabaseDeck,
	DatabaseTweet,
} from "@/src/features/storage/definition";
import {
	convertDatabaseTweetToMasonryInfos,
	type TweetMasonryInfo,
} from "@/src/internals/goodies";
import { addEntitiesFromDatabaseTweets } from "@/src/internals/redux";
import { webpack } from "@/src/internals/webpack";
import { useLiveQuery } from "dexie-react-hooks";
import { List, Masonry, useInfiniteLoader } from "masonic";
import { mergician } from "mergician";
import React from "react";
import { tweetComponents } from "../external/Tweet";
import { components } from "../wrapper";

const TWEET_LIST_FETCH_COUNT = 20;
const TWEET_LIST_FETCH_THRESHOLD = 5;

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
	const deckSize = useLiveQuery(() => getDeckSize(props.deck.id), [], 0);
	const [tweets, setTweets] = useState<TweetMasonryInfo[]>([]);

	const [tweetComponentsAvailable, setTweetComponentsAvailable] =
		useState(false);
	useEffect(() => {
		const listener = () => setTweetComponentsAvailable(true);
		if (tweetComponents.meta.available) setTweetComponentsAvailable(true);
		else tweetsEventTarget.addEventListener("components-available", listener);
		return () =>
			tweetsEventTarget.removeEventListener("components-available", listener);
	}, []);

	useEffect(() => {
		(async () => {
			const initialTweets = await getDeckTweets(props.deck.id, 0, 20);
			await addEntitiesFromDatabaseTweets(initialTweets);
			setTweets(
				initialTweets.flatMap((t) => convertDatabaseTweetToMasonryInfos(t)),
			);
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
			threshold: 5,
			totalItems: deckSize,
		},
	);

	// note: thank your past self for implementing react proxies.
	return (
		<div className="grow p-4">
			{tweetComponentsAvailable && (
				<tweetComponents.ContextBridge>
					<Masonry
						onRender={maybeLoadMore}
						items={tweets}
						columnGutter={8}
						rowGutter={8}
						columnCount={2}
						render={({ index, width, data }) => {
							const url = `/${data.author.name}/status/${data.id}${data.info.type === "photo" ? `/photo/${data.info.index}` : ""}`;
							return (
								<article
									style={{ width: `${width}px` }}
									className="rounded-2xl overflow-hidden relative group"
								>
									<a
										href={url}
										onClick={(ev) => {
											ev.preventDefault();
											webpack.common.history.push(url);
										}}
									>
										<img
											key={`${data.id}-${index}`}
											src={data.info.url}
											width={data.info.width}
											height={data.info.height}
											alt="meow"
										/>
									</a>
									<div className="absolute w-full h-full top-0 left-0 group-hover:flex! pointer-events-none rounded-2xl hidden bg-black/25"></div>
									<a
										href={`/${data.author.name}`}
										onClick={(ev) => {
											ev.preventDefault();
											webpack.common.history.push(`/${data.author.name}`);
										}}
										className="absolute bottom-2 left-2 z-1"
									>
										<img
											className="rounded-full aspect-square w-9"
											src={data.author.profileImage}
											alt="pfp"
											style={{
												filter: "drop-shadow(rgba(0, 0, 0, 0.35) 0 0 10px)",
											}}
										/>
									</a>
									<div className="absolute bottom-2 right-2 group-hover:flex! hidden flex-row justify-end items-center z-1">
										<button
											type="button"
											className="hover:shadow-darken! bg-white rounded-full p-2 w-9"
											onClick={(ev) => {
												ev.stopPropagation();
												ev.preventDefault();

												components.SelectDeckPopup.initiator ===
												ev.currentTarget
													? components.SelectDeckPopup.hide()
													: components.SelectDeckPopup.show(
															ev.currentTarget,
															"masonry-cell",
														);
											}}
											favedeck-tweet-id={data.id}
										>
											<svg
												className="text-fd-primary"
												fill="currentcolor"
												viewBox="0 0 24 24"
											>
												<title>bookmark icon</title>
												<g>
													<path d="M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5z"></path>
												</g>
											</svg>
										</button>
									</div>
								</article>
							);
						}}
					/>
				</tweetComponents.ContextBridge>
			)}
		</div>
	);
}

const TweetWrapper = React.memo(function TweetWrapper(props: {
	data: DatabaseTweet;
}) {
	return (
		<div className="*:static!">
			<tweetComponents.Tweet
				{...patchTweetProps(props.data, tweetComponents.meta.defaultTweetProps)}
			/>
		</div>
	);
});

export function DeckTweetList(props: { deck: DatabaseDeck }) {
	const deckSize = useLiveQuery(() => getDeckSize(props.deck.id), [], 0);
	const [tweets, setTweets] = useState<DatabaseTweet[]>([]);

	const [tweetComponentsAvailable, setTweetComponentsAvailable] =
		useState(false);
	useEffect(() => {
		const listener = () => setTweetComponentsAvailable(true);
		if (tweetComponents.meta.available) setTweetComponentsAvailable(true);
		else tweetsEventTarget.addEventListener("components-available", listener);
		return () =>
			tweetsEventTarget.removeEventListener("components-available", listener);
	}, []);

	useEffect(() => {
		(async () => {
			const initialTweets = await getDeckTweets(
				props.deck.id,
				0,
				TWEET_LIST_FETCH_COUNT,
			);
			await addEntitiesFromDatabaseTweets(initialTweets);
			setTweets(initialTweets);
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
			setTweets((current) => [...current, ...newTweets]);
		},
		{
			isItemLoaded: (index, items) => !!items[index],
			threshold: TWEET_LIST_FETCH_THRESHOLD,
			minimumBatchSize: TWEET_LIST_FETCH_COUNT,
			totalItems: deckSize,
		},
	);

	// note: thank your past self for implementing react proxies.
	return (
		<div className="grow">
			{tweetComponentsAvailable && (
				<tweetComponents.ContextBridge>
					<List items={tweets} render={TweetWrapper} onRender={maybeLoadMore} />
				</tweetComponents.ContextBridge>
			)}
		</div>
	);
}

/* export function DeckTweetList(props: { deck: DatabaseDeck }) {
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
 */
