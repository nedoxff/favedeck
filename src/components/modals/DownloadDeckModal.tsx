import { Result } from "better-result";
import { getProperty } from "dot-prop";
import type { ReactNode } from "react";
import { getAllDeckTweets } from "@/src/features/storage/decks";
import { type DatabaseDeck, db } from "@/src/features/storage/definition";
import { cn } from "@/src/helpers/cn";
import { websiteMessenger } from "@/src/helpers/messaging/content";
import type {
	DeckDownloaderFilenameOption,
	DeckDownloaderMediaType,
	DeckDownloaderOptions,
	DeckDownloaderState,
} from "@/src/isolated-or-background/deck-downloader/root";
import HandleIcon from "~icons/mdi/at";
import DateIcon from "~icons/mdi/calendar";
import GifIcon from "~icons/mdi/gif";
import ImageIcon from "~icons/mdi/image-outline";
import DimensionsIcon from "~icons/mdi/image-size-select-large";
import TextIcon from "~icons/mdi/text";
import VideoIcon from "~icons/mdi/video-outline";
import Checkbox from "../common/Checkbox";
import Spinner from "../common/Spinner";
import { components } from "../wrapper";
import { TwitterModal } from "./TwitterModal";

function ToggleableButton(props: {
	toggled: boolean;
	onToggle: () => void;
	icon: ReactNode;
	text: string;
}) {
	return (
		<button
			className={cn(
				"p-4 flex flex-col gap-2 justify-center items-center rounded-xl border-2 cursor-pointer *:select-none",
				props.toggled ? "border-fd-primary" : "border-fd-border",
			)}
			type="button"
			onClick={props.onToggle}
		>
			{props.icon}
			<p className="text-center">{props.text}</p>
		</button>
	);
}

export default function DownloadDeckModal(props: {
	deck: DatabaseDeck;
	onClose: () => void;
}) {
	const [processingState, setProcessingState] = useState<string | undefined>(
		undefined,
	);
	const [lastState, setLastState] = useState<DeckDownloaderState | undefined>(
		undefined,
	);
	const [options, setOptions] = useState<DeckDownloaderOptions>({
		includeQuotes: false,
		media: [],
		filenameOptions: [],
	});
	const [closeOnComplete, setCloseOnComplete] = useState<boolean>(false);

	const toggleMedia = (media: DeckDownloaderMediaType) =>
		setOptions((current) => ({
			...current,
			media: current.media.includes(media)
				? current.media.filter((m) => m !== media)
				: [...current.media, media],
		}));

	const toggleFilenameOption = (option: DeckDownloaderFilenameOption) =>
		setOptions((current) => ({
			...current,
			filenameOptions: current.filenameOptions.includes(option)
				? current.filenameOptions.filter((o) => o !== option)
				: [...current.filenameOptions, option],
		}));

	useEffect(() => {
		const removeListener = websiteMessenger.onMessage(
			"deckDownloader:update",
			(message) =>
				setLastState((current) => {
					if (current === undefined) {
						websiteMessenger.sendMessage("deckDownloader:forward", {
							type: "toggleContinuousUpdates",
							data: { enabled: true },
						});
					}
					return message.data;
				}),
		);
		return removeListener;
	}, []);

	useEffect(() => {
		websiteMessenger.sendMessage("deckDownloader:forward", {
			type: "requestState",
			data: {},
		});
	}, []);

	useEffect(() => {
		if (lastState?.state === "processing" && processingState) {
			setProcessingState(undefined);
			setOptions({ media: [], filenameOptions: [], includeQuotes: false });
		}
	}, [processingState, lastState]);

	useEffect(() => {
		if (lastState?.state === "complete" && closeOnComplete) {
			components.Toast.success(`Successfully downloaded "${props.deck.name}"`);
			props.onClose();
		}
	}, [lastState, closeOnComplete, props.onClose]);

	return (
		<TwitterModal onClose={props.onClose} className="max-w-lg">
			{!lastState ? (
				<Spinner size="large" />
			) : lastState.state !== "processing" ? (
				<>
					<p className="font-bold text-2xl">Download deck</p>
					<p className="opacity-75">What would you like to export?</p>
					<div className="flex flex-row flex-wrap gap-2 *:flex-1 *:basis-[calc(50%-0.5rem)]">
						<ToggleableButton
							toggled={options.media.includes("images")}
							onToggle={() => toggleMedia("images")}
							icon={<ImageIcon width={32} height={32} />}
							text="Images"
						/>
						<ToggleableButton
							toggled={options.media.includes("videos")}
							onToggle={() => toggleMedia("videos")}
							icon={<VideoIcon width={32} height={32} />}
							text="Videos"
						/>
						<ToggleableButton
							toggled={options.media.includes("gifs")}
							onToggle={() => toggleMedia("gifs")}
							icon={<GifIcon width={32} height={32} />}
							text="GIFs"
						/>
						<ToggleableButton
							toggled={options.media.includes("text")}
							onToggle={() => toggleMedia("text")}
							icon={<TextIcon width={32} height={32} />}
							text="Text"
						/>
					</div>

					<p className="opacity-75">What should the filenames include?</p>
					<div className="flex flex-row flex-wrap gap-2 *:flex-1 *:basis-[calc(33%-1rem)]">
						<ToggleableButton
							toggled={options.filenameOptions.includes("handle")}
							onToggle={() => toggleFilenameOption("handle")}
							icon={<HandleIcon width={32} height={32} />}
							text="Author's handle"
						/>
						<ToggleableButton
							toggled={options.filenameOptions.includes("size")}
							onToggle={() => toggleFilenameOption("size")}
							icon={<DimensionsIcon width={32} height={32} />}
							text="Media's resolution"
						/>
						<ToggleableButton
							toggled={options.filenameOptions.includes("date")}
							onToggle={() => toggleFilenameOption("date")}
							icon={<DateIcon width={32} height={32} />}
							text="Date of posting"
						/>
					</div>

					<div className="flex flex-row gap-2 items-end">
						<Checkbox
							className=" scale-75"
							checked={options.includeQuotes}
							onChecked={(checked) =>
								setOptions((c) => ({ ...c, includeQuotes: checked }))
							}
						/>
						<p>Include quote tweets</p>
					</div>

					<button
						onClick={async () => {
							try {
								setProcessingState("Gathering tweets");
								const tweets = await getAllDeckTweets(props.deck.id).toArray();
								await websiteMessenger.sendMessage("deckDownloader:forward", {
									type: "prepare",
									data: { deck: props.deck, tweets },
								});

								setProcessingState("Gathering entities");
								const seenTweets = new Set<string>();
								const seenUsers = new Set<string>();

								const processTweet = (id: string) =>
									Result.tryPromise(async () => {
										if (seenTweets.has(id)) return;
										const rawTweetEntity = await db.entities.get(`tweet-${id}`);
										if (!rawTweetEntity)
											throw new Error(`entity tweet-${id} not found`);

										const quoteOf = getProperty(
											rawTweetEntity.meta,
											"quoteOf",
										) as string | undefined;
										const user = getProperty(rawTweetEntity.meta, "user") as
											| string
											| undefined;
										if (!user)
											throw new Error(
												`cannot process tweet ${id} (missing meta.user)`,
											);

										if (!seenUsers.has(user)) {
											const rawUserEntity = await db.entities.get(
												`user-${user}`,
											);
											if (!rawUserEntity)
												throw new Error(
													`entity user-${user} not found (needed for tweet-${id})`,
												);
											await websiteMessenger.sendMessage(
												"deckDownloader:forward",
												{
													type: "pushEntity",
													data: {
														key: `user-${user}`,
														payload: Array.from(
															await rawUserEntity.data.bytes(),
														),
													},
												},
											);
										}

										await websiteMessenger.sendMessage(
											"deckDownloader:forward",
											{
												type: "pushEntity",
												data: {
													key: `tweet-${id}`,
													payload: Array.from(
														await rawTweetEntity.data.bytes(),
													),
												},
											},
										);
										seenTweets.add(id);
										if (quoteOf) await processTweet(quoteOf);
									});

								for (const tweet of tweets) {
									const result = await processTweet(tweet.id);
									if (result.isErr()) {
										props.onClose();
										components.Toast.error(
											`An error occurred while gathering entities for download (${tweet.id})`,
											result.error,
										);
										return;
									}
								}

								setProcessingState("Starting download process");
								setCloseOnComplete(true);
								await websiteMessenger.sendMessage("deckDownloader:forward", {
									type: "beginDownload",
									data: { options },
								});
								await websiteMessenger.sendMessage("deckDownloader:forward", {
									type: "toggleContinuousUpdates",
									data: { enabled: true },
								});
							} catch (err) {
								components.Toast.error(
									`Couldn't start downloading deck`,
									Error.isError(err) ? err : new Error(`${err}`),
								);
								props.onClose();
							}
						}}
						disabled={
							processingState !== undefined ||
							!options.media.length ||
							!options.filenameOptions.length
						}
						type="button"
						className="mt-2 flex justify-center items-center rounded-full w-full text-white font-bold bg-fd-primary! disabled:shadow-darken! hover:shadow-darken! py-2 px-4 text-center! cursor-pointer disabled:cursor-not-allowed"
					>
						{processingState ? (
							<>
								<Spinner
									size="small"
									className="border-[rgba(255,255,255,0.25)]! border-b-white!"
								/>
								<p className="ml-2">{processingState}</p>
							</>
						) : (
							"Download!"
						)}
					</button>
					<button
						onClick={props.onClose}
						type="button"
						className="rounded-full w-full text-fd-fg font-bold bg-fd-bg-15! hover:shadow-lighten! py-2 px-4 text-center! cursor-pointer"
					>
						Cancel
					</button>
				</>
			) : (
				<div className="flex flex-col gap-2 justify-center items-center">
					<Spinner size="large" />
					<p className="text-center">
						<span className="text-2xl font-bold">
							A download is in progress
						</span>
						{lastState.progress && (
							<>
								<br />
								<span className="opacity-75">
									{lastState.progress.current}/{lastState.progress.total}
									{lastState.progress.skipped
										? ` (${lastState.progress.skipped} skipped)`
										: ""}
								</span>
							</>
						)}
					</p>
					<p className="opacity-75 text-center">
						Another deck can be download once this one is finished.
						<br />
						You can close this dialog window.
					</p>
					<button
						type="button"
						onClick={async () => {
							try {
								await websiteMessenger.sendMessage("deckDownloader:forward", {
									type: "abortDownload",
									data: {},
								});
								components.Toast.warning(`Deck download successfully aborted`);
								props.onClose();
							} catch (err) {
								components.Toast.error(
									`Couldn't abort download`,
									Error.isError(err) ? err : new Error(`${err}`),
								);
								props.onClose();
							}
						}}
						className={
							"rounded-full w-full text-white font-bold disabled:shadow-darken! hover:shadow-darken! py-2 px-4 text-center! bg-fd-danger! cursor-pointer"
						}
					>
						Abort download
					</button>
					<button
						onClick={props.onClose}
						type="button"
						className="rounded-full w-full text-fd-fg font-bold bg-fd-bg-15! hover:shadow-lighten! py-2 px-4 text-center! cursor-pointer"
					>
						Close
					</button>
				</div>
			)}
		</TwitterModal>
	);
}
