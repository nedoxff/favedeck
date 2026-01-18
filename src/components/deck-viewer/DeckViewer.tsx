import { useLiveQuery } from "dexie-react-hooks";
import { forwardRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { decksEventTarget } from "@/src/features/events/decks";
import { tweetsEventTarget } from "@/src/features/events/tweets";
import { getDeck, isTweetInDeck } from "@/src/features/storage/decks";
import type { DatabaseDeck } from "@/src/features/storage/definition";
import { waitForSelector } from "@/src/helpers/observer";
import { webpack } from "@/src/internals/webpack";
import BackIcon from "~icons/mdi/arrow-left";
import SettingsIcon from "~icons/mdi/cog-outline";
import VerticalMoreIcon from "~icons/mdi/dots-vertical";
import InformationIcon from "~icons/mdi/information-outline";
import { IconButton } from "../common/IconButton";
import DeckDropdown from "../dropdown/DeckDropdown";
import {
	TwitterDropdown,
	TwitterDropdownItem,
} from "../dropdown/TwitterDropdown";
import { tweetComponents } from "../external/Tweet";
import { components } from "../wrapper";
import DeckAboutView from "./DeckAboutView";
import { DeckBoard } from "./DeckBoard";
import DeckSettingsView from "./DeckSettingsView";
import { DeckMasonryList, DeckTweetList } from "./DeckTweetList";

function InternalDeckRenderer(props: { deck: DatabaseDeck }) {
	const [tweetComponentsAvailable, setTweetComponentsAvailable] =
		useState(false);

	useEffect(() => {
		const listener = () => setTweetComponentsAvailable(true);
		if (tweetComponents.meta.available) setTweetComponentsAvailable(true);
		else tweetsEventTarget.addEventListener("components-available", listener);
		return () =>
			tweetsEventTarget.removeEventListener("components-available", listener);
	}, []);

	return props.deck.id === "all"
		? null
		: tweetComponentsAvailable && (
				<tweetComponents.ContextBridge>
					{props.deck.viewMode === "regular" ? (
						<DeckTweetList deck={props.deck} />
					) : (
						<DeckMasonryList deck={props.deck} />
					)}
				</tweetComponents.ContextBridge>
			);
}

function InternalDeckViewer() {
	// the section can be a deck id, or a special string like "about", "settings", etc.
	const [currentSection, setCurrentSection] = useState<string | null>(
		decksEventTarget.currentDeck,
	);
	const [currentDeck, currentDeckLoaded] = useLiveQuery(
		() => getDeck(currentSection ?? "").then((deck) => [deck, true]),
		[currentSection],
		[undefined, false],
	);
	const isSpecialSection = useMemo(
		() => ["about", "settings"].includes(currentSection ?? ""),
		[currentSection],
	);

	useEffect(() => {
		const listener = (ev: CustomEvent<string | null>) =>
			setCurrentSection(ev.detail);
		decksEventTarget.addEventListener("current-deck-changed", listener);
		return () =>
			decksEventTarget.removeEventListener("current-deck-changed", listener);
	}, []);

	useEffect(
		() =>
			queueMicrotask(() => {
				currentSection === "all"
					? components.DeckViewer.originalContainer.show()
					: components.DeckViewer.originalContainer.hide();
			}),
		[currentSection],
	);

	const sectionRenderer = useMemo(() => {
		if (currentDeckLoaded && currentDeck)
			return <InternalDeckRenderer deck={currentDeck} />;
		switch (currentSection ?? "") {
			case "about":
				return <DeckAboutView />;
			case "settings":
				return <DeckSettingsView />;
			default:
				return <DeckBoard />;
		}
	}, [currentSection, currentDeck, currentDeckLoaded]);

	return (
		<div className="flex flex-col">
			<div className="h-14 px-4 flex flex-row justify-between items-center w-full sticky top-0 z-10 bg-fd-bg/75 backdrop-blur-xl">
				<div className="flex flex-row gap-6 justify-center items-center">
					<a
						href="/home"
						onClick={(ev) => {
							ev.preventDefault();
							if (currentSection === null) webpack.common.history.push("/home");
							else {
								setCurrentSection(null);
								if (
									webpack.common.history._history.location.state ===
									"from-deck-view"
								)
									webpack.common.history.goBack();
								else webpack.common.history.push("/i/bookmarks");
							}
						}}
					>
						<div className="rounded-full hover:shadow-lighten! p-2">
							<BackIcon width={24} height={24} />
						</div>
					</a>
					<p className="font-bold text-2xl">
						{currentDeck ? currentDeck.name : "Decks"}
					</p>
				</div>

				{currentDeck ? (
					<DeckDropdown deck={currentDeck} />
				) : (
					!isSpecialSection && (
						<TwitterDropdown<HTMLButtonElement>
							trigger={forwardRef(({ isOpen, setOpen }, ref) => (
								<IconButton
									ref={ref}
									onClick={(ev) => {
										ev.stopPropagation();
										setOpen(!isOpen);
									}}
								>
									<VerticalMoreIcon width={24} height={24} />
								</IconButton>
							))}
						>
							{({ setOpen }) => (
								<>
									<TwitterDropdownItem
										text="Settings"
										icon={<SettingsIcon width={24} height={24} />}
										onClick={(ev) => {
											ev.preventDefault();
											setOpen(false);
											decksEventTarget.setCurrentDeck("settings");
											webpack.common.history.push({
												hash: "#fd-settings",
												pathname: "/i/bookmarks",
												state: "from-deck-view",
											});
										}}
									/>
									<TwitterDropdownItem
										text="About favedeck"
										icon={<InformationIcon width={24} height={24} />}
										onClick={(ev) => {
											ev.preventDefault();
											setOpen(false);
											decksEventTarget.setCurrentDeck("settings");
											webpack.common.history.push({
												hash: "#fd-about",
												pathname: "/i/bookmarks",
												state: "from-deck-view",
											});
										}}
									/>
								</>
							)}
						</TwitterDropdown>
					)
				)}
			</div>
			<hr className="border-t-2" />
			{sectionRenderer}
		</div>
	);
}

export const DeckViewer: {
	create: () => void;
	hide: () => void;
	isMounted: boolean;
	checkTweet: (node: HTMLElement, id: string) => void;
	originalContainer: {
		value: HTMLElement | undefined;
		show: () => void;
		hide: () => void;
	};
} = (() => {
	let root: Root | undefined;
	let originalContainer: HTMLElement | undefined;
	let container: HTMLElement | undefined;

	return {
		async create() {
			if (components.DeckViewer.isMounted) {
				console.log("unmounting old DeckViewer");
				components.DeckViewer.hide();
			}

			container = await waitForSelector(document.body, "#favedeck-viewer");
			if (!container) {
				console.error("couldn't find favedeck container");
				return;
			}

			console.log("mounting new DeckViewer");
			root = createRoot(container);
			root.render(<InternalDeckViewer />);
		},
		hide() {
			console.log("unmounting DeckViewer");
			root?.unmount();
			root = undefined;
			if (container?.isConnected) container.remove();
			container = undefined;
			decksEventTarget.setCurrentDeck(null);
		},
		get isMounted() {
			return root !== undefined && (container?.isConnected ?? false);
		},
		async checkTweet(node, id) {
			if (
				this.isMounted &&
				(decksEventTarget.currentDeck === null ||
					decksEventTarget.currentDeck === "all")
			) {
				const decked = await isTweetInDeck(id);
				node.style.backgroundColor = decked
					? "color-mix(in srgb, var(--fd-primary), transparent 85%)"
					: "transparent";
				node.dataset.favedeckDecked = decked ? "yes" : "no";
				node.dataset.favedeckId = id;
				//node.style.display = "none";
			}
		},
		originalContainer: {
			show() {
				if (!originalContainer) return;
				originalContainer.style.position = "";
				originalContainer.style.pointerEvents = "auto";
				originalContainer.style.zIndex = "0";
				originalContainer.style.maxHeight = "";
				originalContainer.style.overflowY = "";
				queueMicrotask(() => {
					if (originalContainer) originalContainer.style.opacity = "1";
				});
			},
			hide() {
				if (!originalContainer) return;
				originalContainer.style.position = "absolute";
				originalContainer.style.width = "100%";
				(originalContainer.childNodes[0] as HTMLElement).style.display = "none";
				originalContainer.style.pointerEvents = "none";
				originalContainer.style.opacity = "0";
				originalContainer.style.zIndex = "-1000";
				originalContainer.style.maxHeight = "100vh";
				originalContainer.style.overflowY = "hidden";
			},
			get value() {
				return originalContainer;
			},
			set value(container) {
				originalContainer = container;
				this.hide();
			},
		},
	};
})();
