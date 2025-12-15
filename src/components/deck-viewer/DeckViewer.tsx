// oh boy

import {
	getDeckSize,
	getDeckThumbnails,
	getDeckTweets,
	getUserDecksAutomatically,
} from "@/src/features/storage/decks";
import {
	type DatabaseDeck,
	type DatabaseTweet,
	db,
} from "@/src/features/storage/definition";
import { decks } from "@/src/features/storage/kv";
import { waitForSelector } from "@/src/helpers/observer";
import { addEntitiesFromDatabaseTweets } from "@/src/internals/redux";
import { webpack } from "@/src/internals/webpack";
import { useLiveQuery } from "dexie-react-hooks";
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { tweetComponents } from "../Tweet";
import { mergician } from "mergician";

const patchTweetProps = (
	tweet: DatabaseTweet,
	props: Record<string, unknown>,
) => {
	const copy = mergician({}, props);
	// @ts-expect-error
	copy.item.id = `tweet-${tweet.id}`;
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

function DeckTweetList(props: { deck: DatabaseDeck }) {
	const [tweetComponentsAvailable, setTweetComponentsAvailable] = useState(
		tweetComponents.meta.available,
	);
	const tweets = useLiveQuery(() => getDeckTweets(props.deck.id));
	const ref = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (!tweetComponentsAvailable) {
			tweetComponents.meta = new Proxy(tweetComponents.meta, {
				set(target, p, newValue, _receiver) {
					if (p === "available") setTweetComponentsAvailable(newValue);
					// @ts-expect-error
					target[p] = newValue;
					return true;
				},
			});
			return;
		}
		if (!ref.current || !tweets || tweets.length === 0) return;

		(async () => {
			await addEntitiesFromDatabaseTweets(tweets ?? []);

			queueMicrotask(() => {
				if (!ref.current) return;
				const TwitterReact = webpack.common.react.React;
				const TwitterReactDOM = webpack.common.react.ReactDOM;
				const root = TwitterReactDOM.createRoot(ref.current);

				const tweetsContainer = TwitterReact.createElement(React.Fragment, {
					children: tweets.map((t) =>
						TwitterReact.createElement(tweetComponents.Tweet, {
							...patchTweetProps(t, tweetComponents.meta.defaultTweetProps),
						}),
					),
				});

				const bridge = TwitterReact.createElement(
					tweetComponents.ContextBridge,
					{
						children: tweetsContainer,
					},
				);
				root.render(TwitterReact.createElement(() => bridge));
			});
		})();
	}, [tweetComponentsAvailable, ref.current, tweets]);

	return <div ref={ref} className="*:static!" />;
}

function DeckBoardItem(props: { deck: DatabaseDeck }) {
	const thumbnails = useLiveQuery(() => getDeckThumbnails(props.deck.id, 3));
	const size = useLiveQuery(() => getDeckSize(props.deck.id));

	return (
		<a
			href={`#fd-${props.deck.id}`}
			onClick={(ev) => {
				ev.preventDefault();
				decks.currentDeck.set(props.deck);
				window.history.pushState("from-deck-view", "", `#fd-${props.deck.id}`);
			}}
			className="grow shrink basis-[45%] max-w-[calc(50%-8px)] h-60"
		>
			<div className="hover:cursor-pointer group/fd-image w-full h-full flex flex-col gap-2 p-2 hover:shadow-lighten! rounded-2xl">
				<div className="grow rounded-xl overflow-hidden relative grid grid-cols-4 grid-rows-2 gap-1">
					<div className="col-span-2 row-span-2 bg-fd-bg-even-lighter relative">
						{(thumbnails ?? []).length > 0 && (
							<img
								src={thumbnails?.[0]}
								className="absolute w-full h-full object-cover"
								alt="preview 1"
							/>
						)}
					</div>
					<div className="col-span-2 col-start-3! bg-fd-bg-even-lighter relative">
						{(thumbnails ?? []).length > 1 && (
							<img
								src={thumbnails?.[1]}
								className="absolute w-full h-full object-cover"
								alt="preview 2"
							/>
						)}
					</div>
					<div className="col-span-2 col-start-3! row-start-2 bg-fd-bg-even-lighter relative">
						{(thumbnails ?? []).length > 2 && (
							<img
								src={thumbnails?.[2]}
								className="absolute w-full h-full object-cover"
								alt="preview 3"
							/>
						)}
					</div>
				</div>
				<div className="pointer-events-none">
					<p className="font-bold text-xl">{props.deck.name}</p>
					<p className="opacity-50">
						{size} {size === 1 ? "tweet" : "tweets"}
					</p>
				</div>
			</div>
		</a>
	);
}

function DeckBoard() {
	const userDecks = useLiveQuery(getUserDecksAutomatically);
	const currentDeck = useLiveQuery(decks.currentDeck.get);

	return (
		<div className="flex flex-col">
			<div className="h-14 px-4 gap-6 flex flex-row items-center">
				<a
					href="/home"
					onClick={(ev) => {
						ev.preventDefault();
						if (currentDeck === undefined) webpack.common.history.push("/home");
						else {
							decks.currentDeck.set(undefined);
							if (window.history.state === "from-deck-view")
								window.history.back();
							else window.history.pushState(null, "", "/i/bookmarks");
						}
					}}
				>
					<div className="rounded-full hover:shadow-lighten! p-2">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="24px"
							height="24px"
							viewBox="0 0 512 512"
						>
							<title>back arrow icon</title>
							<path
								fill="none"
								stroke="currentColor"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="48"
								d="M244 400L100 256l144-144M120 256h292"
							/>
						</svg>
					</div>
				</a>
				<p className="font-bold text-2xl">
					{currentDeck ? currentDeck.name : "Decks"}
				</p>
			</div>
			<hr className="border-t-2" />
			{currentDeck === undefined ? (
				<div className="p-4 gap-2 flex flex-row flex-wrap">
					{(userDecks ?? []).map((d) => (
						<DeckBoardItem key={d.id} deck={d} />
					))}
				</div>
			) : (
				<DeckTweetList deck={currentDeck} />
			)}
		</div>
	);
}

export const DeckViewer = (() => {
	let root: Root;

	return {
		async create() {
			await decks.currentDeck.set(undefined);
			if (root) {
				console.log("unmounting old DeckViewer");
				root.unmount();
			}

			const container = await waitForSelector(
				document.body,
				"#favedeck-viewer",
			);
			if (!container) {
				console.error("couldn't find favedeck container");
				return;
			}

			console.log("mounting new DeckViewer");
			root = createRoot(container);
			root.render(<DeckBoard />);

			if (window.location.hash.includes("fd")) {
				await decks.currentDeck.set(
					await db.decks.get(window.location.hash.substring(4)),
				);
			}
		},
		hide() {
			console.log("unmounting DeckViewer");
			root.unmount();
		},
	} satisfies {
		create: () => void;
		hide: () => void;
	};
})();
