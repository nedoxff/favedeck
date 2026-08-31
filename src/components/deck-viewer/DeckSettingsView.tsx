import { useLiveQuery } from "dexie-react-hooks";
import { forwardRef } from "react";
import { kv } from "@/src/features/storage/kv";
import {
	type FavedeckSettings,
	setSetting,
} from "@/src/features/storage/settings";
import ChevronDownIcon from "~icons/mdi/chevron-down";
import Checkbox from "../common/Checkbox";
import ListTile from "../common/ListTile";
import {
	TwitterDropdown,
	TwitterDropdownItem,
} from "../dropdown/TwitterDropdown";
import { components } from "../wrapper";

export default function DeckSettingsView() {
	const settings = useLiveQuery(kv.settings.get);

	return (
		settings && (
			<div className="flex flex-col">
				<ListTile
					title="Update statistics when browsing decks"
					description={
						<>
							Whether to update the statistics (e.g. likes, views, etc.) when
							opening decks. Mostly useful for the default view mode.
							<b>
								{" "}
								This is a rate-limited action which might stop working if you
								switch decks too often.
							</b>
						</>
					}
					endContent={
						<Checkbox
							checked={settings.updateStatistics}
							onChecked={(ch) => setSetting("updateStatistics", ch)}
						/>
					}
					onClick={() =>
						setSetting("updateStatistics", !settings.updateStatistics)
					}
				/>

				<ListTile
					title="Fetch more tweets per request"
					description={
						<>
							Will fetch 100 tweets instead of the regular 20 when using
							paginated Twitter APIs. Might help with bypassing certain
							ratelimits.{" "}
							<b>
								Only enable this if you have a strong internet connection or
								you're ready to wait for a bit longer.
							</b>
						</>
					}
					endContent={
						<Checkbox
							checked={settings.fetchMoreTweetsPerRequest}
							onChecked={(ch) => setSetting("fetchMoreTweetsPerRequest", ch)}
						/>
					}
					onClick={() =>
						setSetting(
							"fetchMoreTweetsPerRequest",
							!settings.fetchMoreTweetsPerRequest,
						)
					}
				/>

				<ListTile
					title="Preferred bookmarks sort interface"
					endContent={
						<TwitterDropdown<HTMLDivElement>
							trigger={forwardRef(({ isOpen, setOpen }, ref) => (
								<div
									role="button"
									ref={ref}
									onClick={(ev) => {
										ev.stopPropagation();
										setOpen(!isOpen);
									}}
									className="p-2 pr-1 cursor-pointer rounded-xl hover:shadow-lighten! flex flex-row justify-center items-center gap-2"
								>
									<p>
										{settings.preferredSortBookmarksInterface === "ask"
											? "Ask every time"
											: settings.preferredSortBookmarksInterface === "card-game"
												? "Card Game"
												: "Masonry"}
									</p>
									<ChevronDownIcon width={24} height={24} />
								</div>
							))}
						>
							{({ setOpen }) => (
								<>
									<TwitterDropdownItem
										text="Ask every time"
										onClick={() => {
											setSetting("preferredSortBookmarksInterface", "ask");
											setOpen(false);
										}}
									/>
									<TwitterDropdownItem
										text="Card Game"
										onClick={() => {
											setSetting(
												"preferredSortBookmarksInterface",
												"card-game",
											);
											setOpen(false);
										}}
									/>
									<TwitterDropdownItem
										text="Masonry"
										onClick={() => {
											setSetting("preferredSortBookmarksInterface", "masonry");
											setOpen(false);
										}}
									/>
								</>
							)}
						</TwitterDropdown>
					}
				/>

				<ListTile
					title="Show deck popup for likes"
					description={
						<>
							Whether to enable categorizing likes into decks, alongside
							bookmarks.
						</>
					}
					endContent={
						<Checkbox
							checked={settings.showDeckPopupForLikes}
							onChecked={(ch) => setSetting("showDeckPopupForLikes", ch)}
						/>
					}
					onClick={() =>
						setSetting("showDeckPopupForLikes", !settings.showDeckPopupForLikes)
					}
				/>

				<ListTile
					title="Auto-backup frequency"
					endContent={
						<TwitterDropdown<HTMLDivElement>
							trigger={forwardRef(({ isOpen, setOpen }, ref) => (
								<div
									role="button"
									ref={ref}
									onClick={(ev) => {
										ev.stopPropagation();
										setOpen(!isOpen);
									}}
									className="p-2 pr-1 cursor-pointer rounded-xl hover:shadow-lighten! flex flex-row justify-center items-center gap-2"
								>
									<p>
										{
											(
												{
													disabled: "Never",
													hour: "Every hour",
													day: "Every day",
													week: "Every week",
												} satisfies Record<
													FavedeckSettings["autoBackupPreference"],
													string
												>
											)[settings.autoBackupPreference]
										}
									</p>
									<ChevronDownIcon width={24} height={24} />
								</div>
							))}
						>
							{({ setOpen }) => (
								<>
									<TwitterDropdownItem
										text="Never"
										onClick={() => {
											setSetting("autoBackupPreference", "disabled");
											setOpen(false);
										}}
									/>
									<TwitterDropdownItem
										text="Every hour"
										onClick={() => {
											setSetting("autoBackupPreference", "hour");
											setOpen(false);
										}}
									/>
									<TwitterDropdownItem
										text="Every day"
										onClick={() => {
											setSetting("autoBackupPreference", "day");
											setOpen(false);
										}}
									/>
									<TwitterDropdownItem
										text="Every week"
										onClick={() => {
											setSetting("autoBackupPreference", "week");
											setOpen(false);
										}}
									/>
								</>
							)}
						</TwitterDropdown>
					}
				/>

				<button
					onClick={() => {
						components.BackupDetectedModal.performAutoBackup();
						components.Toast.success(
							"Successfully began performing auto-backup",
						);
					}}
					type="button"
					className="ml-5 mt-2 flex justify-center items-center rounded-full w-fit text-white font-bold bg-fd-primary! disabled:shadow-darken! hover:shadow-darken! py-2 px-4 text-center! cursor-pointer"
				>
					Trigger auto-backup
				</button>
			</div>
		)
	);
}
