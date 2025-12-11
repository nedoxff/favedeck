import {
	type Fiber,
	getDisplayName,
	getFiberFromHostInstance,
	getFiberStack,
} from "bippy";
import { useLiveQuery } from "dexie-react-hooks";
import { createRoot } from "react-dom/client";
import { v6 } from "uuid";
import { type DatabaseDeck, db } from "../features/storage/definition";
import { getBackgroundColor, getPrimaryColor } from "../features/storage/kv";
import { compressObject } from "../helpers/compression";
import type { RawTweet } from "../types/tweet";

function DeckCard(props: { index: number; deck?: DatabaseDeck }) {
	const iconRef = useRef<HTMLImageElement>(null!);
	const primaryColor = useLiveQuery(getPrimaryColor);

	useEffect(() => {
		fetch("https://dummyimage.com/200").then(async (r) => {
			const blob = await r.blob();
			const url = URL.createObjectURL(blob);
			iconRef.current.src = url;
		});
	}, []);

	const save = async () => {
		if (!props.deck) {
			db.decks.add({ id: v6(), name: "furries", user: "1" });
		} else {
			const fiber = SelectDeckPopupRenderer.getParentTweetFiber();
			if (!fiber) throw new Error("cannot find the parent twitter fiber");
			const tweet: RawTweet = fiber.memoizedProps?.tweet as RawTweet;
			if (!tweet)
				throw new Error(
					"the tweet fiber (somehow) doesn't have the tweet in memoizedProps",
				);
			//@ts-expect-error
			const userId = fiber.memoizedProps?.viewerUser?.id_str;
			if (!userId)
				throw new Error("the tweet fiber doesn't have the userViewer prop");
			db.tweets.put({
				data: await compressObject(tweet),
				deck: props.deck.id,
				id: tweet.id_str,
				user: userId,
			});
		}
	};

	return (
		<div
			tabIndex={props.index}
			onClick={save}
			role="button"
			className="hover:shadow-lighten! focus:shadow-lighten! hover:cursor-pointer p-2 rounded-lg h-20 w-sm flex flex-row justify-between items-center gap-4"
		>
			<div className="flex flex-row h-full gap-4 justify-center items-center">
				{props.deck ? (
					<img alt="deck icon" className="h-full rounded-lg" ref={iconRef} />
				) : (
					<div className="rounded-lg h-full aspect-square border-dashed border-2 border-white! flex justify-center items-center">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							viewBox="0 0 24 24"
						>
							<path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z" />
						</svg>
					</div>
				)}
				{props.deck ? props.deck.name : "Create a new deck"}
			</div>

			{props.deck && (
				<button
					onClick={save}
					type="button"
					className="rounded-full hover:shadow-darken hover:cursor-pointer px-4 py-2 font-bold bg-red-500"
					style={{ backgroundColor: primaryColor ?? "" }}
				>
					Save
				</button>
			)}
		</div>
	);
}

export function SelectDeckPopup() {
	const decks = useLiveQuery(() => db.decks.toArray());
	const bg = useLiveQuery(getBackgroundColor);
	return (
		<div
			className="p-2 rounded-xl gap-1 flex flex-col"
			style={{
				backgroundColor: bg,
				boxShadow:
					"rgba(255, 255, 255, 0.2) 0px 0px 15px, rgba(255, 255, 255, 0.15) 0px 0px 3px 1px",
			}}
		>
			{(decks ?? []).map((d, idx) => (
				<DeckCard key={d.id} index={idx} deck={d} />
			))}
			<DeckCard index={decks?.length ?? 0 + 1} />
		</div>
	);
}

export const SelectDeckPopupRenderer = (() => {
	let bookmarkButton: HTMLButtonElement | undefined;
	let container: HTMLDivElement | undefined;

	const hide = () => {
		document.removeEventListener("resize", layoutCallback);
		document.removeEventListener("scroll", layoutCallback);
		document.removeEventListener("click", clickCallback);
		if (!container) return;
		container.style.left = "0";
		container.style.top = "0";
		bookmarkButton = undefined;
	};

	const layoutCallback = () => {
		if (!bookmarkButton || !container) return;
		const rect = bookmarkButton.getBoundingClientRect();
		const popupRect = container.getBoundingClientRect();
		const top = rect.top + rect.height + window.scrollY + 15;
		const left =
			rect.left + window.scrollX - popupRect.width / 2 + rect.width / 2;

		container.style.top = `${top}px`;
		container.style.left = `${left}px`;
	};

	const clickCallback = (ev: PointerEvent) => {
		if (
			!bookmarkButton ||
			!container ||
			!ev.target ||
			!(ev.target instanceof Node)
		)
			return;
		if (!container.contains(ev.target)) hide();
	};

	return {
		create() {
			if (document.querySelector("#favedeck-select-deck"))
				window.dispatchEvent(new CustomEvent("remove-favedeck-container"));

			const div = document.createElement("div");
			div.style.zIndex = "1000";
			div.style.position = "absolute";
			div.style.left = "0";
			div.style.top = "0";
			div.id = "favedeck-select-deck";
			document.body.append(div);
			container = div;
			window.addEventListener("remove-favedeck-container", () => {
				hide();
				container?.remove();
			});

			createRoot(div).render(<SelectDeckPopup />);
		},
		getParentTweetFiber() {
			const buttonFiber = getFiberFromHostInstance(bookmarkButton);
			if (!buttonFiber) return null;
			const stack = getFiberStack(buttonFiber);
			return stack.filter((f) => getDisplayName(f) === "Tweet").at(0) ?? null;
		},
		show(bb) {
			bookmarkButton = bb;
			if (!container || !bookmarkButton) return;
			document.addEventListener("resize", layoutCallback);
			document.addEventListener("scroll", layoutCallback);
			document.addEventListener("click", clickCallback);
			layoutCallback();
		},
		hide,
	} satisfies {
		create: () => void;
		show: (bookmarkButton: HTMLButtonElement) => void;
		hide: () => void;
		getParentTweetFiber: () => Fiber | null;
	};
})();
