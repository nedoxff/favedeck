// oh boy

import {
	getDeckSize,
	getDeckTweets,
	getUserDecksAutomatically,
} from "@/src/features/storage/decks";
import type {
	DatabaseDeck,
	DatabaseTweet,
} from "@/src/features/storage/definition";
import { decks } from "@/src/features/storage/kv";
import { waitForSelector } from "@/src/helpers/observer";
import { webpack } from "@/src/helpers/webpack";
import { useLiveQuery } from "dexie-react-hooks";
import { createRoot, type Root } from "react-dom/client";
import { tweetComponents } from "../Tweet";

const patchTweetProps = (
	tweet: DatabaseTweet,
	props: Record<string, unknown>,
) => {
	// @ts-expect-error
	props.item.id = `tweet-${tweet.id}`;
	// @ts-expect-error
	props.item.data.entryId = `tweet-${tweet.id}`;
	// @ts-expect-error
	//props.item.data.itemMetadata.clientEventInfo = undefined;
	// @ts-expect-error
	props.item.data.content.id = tweet.id;
	return props;
};

function DeckTweetList(props: { deck: DatabaseDeck }) {
	const tweets = useLiveQuery(() => getDeckTweets(props.deck.id));
	const ref = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (!ref.current || !tweets || tweets.length === 0) return;

		const TwitterReact = webpack.common.react.React;
		const TwitterReactDOM = webpack.common.react.ReactDOM;
		const root = TwitterReactDOM.createRoot(ref.current);
		console.log(root);

		const tweetsContainer = TwitterReact.createElement("div", {
			children: tweets.map((t) =>
				TwitterReact.createElement(tweetComponents.Tweet, {
					...patchTweetProps(t, tweetComponents.meta.defaultTweetProps),
				}),
			),
		});
		console.log(tweetsContainer);

		const bridge = TwitterReact.createElement(tweetComponents.ContextBridge, {
			children: tweetsContainer,
		});
		console.log(bridge);
		root.render(TwitterReact.createElement(() => bridge));
	}, [ref.current, tweets]);

	return <div ref={ref}></div>;
}

function DeckBoardItem(props: { deck: DatabaseDeck }) {
	const size = useLiveQuery(() => getDeckSize(props.deck.id));

	return (
		<a
			href={`#fd-${props.deck.id}`}
			onClick={(ev) => {
				ev.preventDefault();
				decks.currentDeck.set(props.deck);
			}}
			className="grow shrink basis-[45%] max-w-[calc(50%-8px)] h-60"
		>
			<div className="hover:cursor-pointer group/fd-image w-full h-full flex flex-col gap-2 p-2 hover:shadow-lighten! rounded-2xl">
				<div className="grow bg-amber-800 rounded-xl relative" />
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
						else decks.currentDeck.set(undefined);
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
