import { useLiveQuery } from "dexie-react-hooks";
import { getProperty } from "dot-prop";
import { forwardRef } from "react";
import { createPortal } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { TypedEventTarget } from "typescript-event-target";
import { decksEventTarget } from "@/src/features/events/decks";
import { tweetsEventTarget } from "@/src/features/events/tweets";
import { getDeck } from "@/src/features/storage/decks";
import type { DatabaseDeck } from "@/src/features/storage/definition";
import { isTweetInDeck } from "@/src/features/storage/tweets";
import { waitForSelector } from "@/src/helpers/observer";
import { pauseTweetVideo } from "@/src/internals/goodies";
import { webpack } from "@/src/internals/webpack";
import BackIcon from "~icons/mdi/arrow-left";
import BackupIcon from "~icons/mdi/backup-restore";
import BookmarksIcon from "~icons/mdi/bookmark-outline";
import SettingsIcon from "~icons/mdi/cog-outline";
import VerticalMoreIcon from "~icons/mdi/dots-vertical";
import LikesIcon from "~icons/mdi/heart-outline";
import InformationIcon from "~icons/mdi/information-outline";
import StarIcon from "~icons/mdi/star-four-points-outline";
import { IconButton } from "../common/IconButton";
import Tabs from "../common/Tabs";
import DeckDropdown from "../dropdown/DeckDropdown";
import {
	TwitterDropdown,
	TwitterDropdownItem,
} from "../dropdown/TwitterDropdown";
import { tweetComponents } from "../external/Tweet";
import BackupModal from "../modals/BackupModal";
import SortBookmarksModal from "../modals/SortTweetsModal/SortBookmarksModal";
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

	return props.deck.id.startsWith("all-")
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

function InternalDeckViewer(props: {
	initialCategory?: "bookmarks" | "likes";
}) {
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
	const [category, setCategory] = useState<"bookmarks" | "likes">(
		props.initialCategory ?? "bookmarks",
	);
	const [showSortModal, setShowSortModal] = useState(false);
	const [showBackupModal, setShowBackupModal] = useState(false);

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
				currentSection?.startsWith("all-")
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
				return <DeckBoard category={category} />;
		}
	}, [currentSection, currentDeck, currentDeckLoaded, category]);

	const viewerTitle = useMemo(() => {
		if (currentDeck) return currentDeck.name;
		switch (currentSection) {
			case "about":
				return "About favedeck";
			case "settings":
				return "Settings";
			default:
				return "Decks";
		}
	}, [currentDeck, currentSection]);

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
									getProperty<unknown, string, boolean | undefined>(
										webpack.common.history._history.location.state,
										"fromDeckView",
										undefined,
									)
								)
									webpack.common.history.goBack();
								else webpack.common.history.push("/i/history");
							}
						}}
					>
						<div className="rounded-full hover:shadow-lighten! p-2">
							<BackIcon width={24} height={24} />
						</div>
					</a>
					<p className="font-bold text-2xl">{viewerTitle}</p>
				</div>

				{currentDeck ? (
					<DeckDropdown
						showSortModal={() => setShowSortModal(true)}
						deck={currentDeck}
					/>
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
										icon={<StarIcon width={24} height={24} />}
										text={
											category === "bookmarks" ? "Sort bookmarks" : "Sort likes"
										}
										onClick={() => {
											setShowSortModal(true);
											setOpen(false);
										}}
									/>
									<TwitterDropdownItem
										icon={<BackupIcon width={24} height={24} />}
										text="Backup"
										onClick={() => {
											setShowBackupModal(true);
											setOpen(false);
										}}
									/>
									<TwitterDropdownItem
										text="Settings"
										icon={<SettingsIcon width={24} height={24} />}
										onClick={(ev) => {
											ev.preventDefault();
											setOpen(false);
											decksEventTarget.setCurrentDeck("settings");
											webpack.common.history.push({
												hash: "#fd-settings",
												pathname:
													category === "bookmarks"
														? "/i/history"
														: "/i/history/likes",
												state: { fromDeckView: true },
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
												pathname:
													category === "bookmarks"
														? "/i/history"
														: "/i/history/likes",
												state: { fromDeckView: true },
											});
										}}
									/>
								</>
							)}
						</TwitterDropdown>
					)
				)}

				{showSortModal &&
					createPortal(
						<SortBookmarksModal
							category={category}
							onClose={() => setShowSortModal(false)}
						/>,
						document.body,
					)}

				{showBackupModal &&
					createPortal(
						<BackupModal onClose={() => setShowBackupModal(false)} />,
						document.body,
					)}
			</div>
			{!currentSection && (
				<Tabs
					state={category}
					onUpdate={(newCategory) =>
						setCategory((current) => {
							if (newCategory !== current)
								webpack.common.history.replace(
									newCategory === "bookmarks"
										? "/i/history"
										: "/i/history/likes",
								);
							return newCategory;
						})
					}
					tabs={[
						{
							key: "bookmarks",
							icon: <BookmarksIcon width={24} height={24} />,
							text: "Bookmarks",
						},
						{
							key: "likes",
							icon: <LikesIcon width={24} height={24} />,
							text: "Likes",
						},
					]}
				/>
			)}
			<hr className="border-t border-fd-border" />
			{sectionRenderer}
		</div>
	);
}

class DeckViewerEventTarget extends TypedEventTarget<{
	mounted: Event;
	unmounted: Event;
}> {
	dispatchMounted() {
		this.dispatchTypedEvent("mounted", new Event("mounted"));
	}

	dispatchUnmounted() {
		this.dispatchTypedEvent("unmounted", new Event("unmounted"));
	}
}

export const DeckViewer: {
	create: (initialCategory?: "bookmarks" | "likes") => void;
	hide: () => void;
	isMounted: boolean;
	checkTweet: (node: HTMLElement, id: string) => void;
	originalContainer: {
		value: HTMLElement | undefined;
		show: () => void;
		hide: () => void;
	};
	category?: "bookmarks" | "likes";
	on: DeckViewerEventTarget["addEventListener"];
} = (() => {
	let root: Root | undefined;
	let originalContainer: HTMLElement | undefined;
	let container: HTMLElement | undefined;
	let lastCategory: "bookmarks" | "likes" | undefined;
	const eventTarget: DeckViewerEventTarget = new DeckViewerEventTarget();

	return {
		async create(initialCategory = "bookmarks") {
			lastCategory = initialCategory;
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
			root.render(<InternalDeckViewer initialCategory={initialCategory} />);
			eventTarget.dispatchMounted();
		},
		hide() {
			console.log("unmounting DeckViewer");
			root?.unmount();
			root = undefined;
			if (container?.isConnected) container.remove();
			container = undefined;
			decksEventTarget.setCurrentDeck(null);
			eventTarget.dispatchUnmounted();
		},
		get isMounted() {
			return root !== undefined && (container?.isConnected ?? false);
		},
		get category() {
			return lastCategory;
		},
		async checkTweet(node, id) {
			if (
				this.isMounted &&
				(decksEventTarget.currentDeck === null ||
					decksEventTarget.currentDeck.startsWith("all-"))
			) {
				const category = decksEventTarget.currentDeck?.startsWith("all-")
					? (decksEventTarget.currentDeck.replaceAll("all-", "") as
							| "bookmarks"
							| "likes")
					: undefined;
				const decked = await isTweetInDeck(id, category);
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

				// pause all videos playing in the timeline just in case
				queueMicrotask(() => {
					if (!originalContainer) return;
					for (const video of originalContainer.querySelectorAll("video")) {
						const result = pauseTweetVideo(video);
						if (result.isErr())
							console.warn("failed to pause video", video, result.error);
					}
				});
			},
			get value() {
				return originalContainer;
			},
			set value(container) {
				originalContainer = container;
				this.hide();
			},
		},
		on: (type, listener, options) =>
			eventTarget.addEventListener(type, listener, options),
	};
})();
