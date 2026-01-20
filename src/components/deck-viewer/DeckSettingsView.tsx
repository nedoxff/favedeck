import { useLiveQuery } from "dexie-react-hooks";
import { kv } from "@/src/features/storage/kv";
import { setSetting } from "@/src/features/storage/settings";
import Checkbox from "../common/Checkbox";
import ListTile from "../common/ListTile";

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
					title="Include quoted tweets"
					description="When on, will include the media of quoted tweets (and quoted tweets of quoted tweets and so on) when browsing a deck in masonry mode."
					endContent={
						<Checkbox
							checked={settings.includeQuoteTweets}
							onChecked={(ch) => setSetting("includeQuoteTweets", ch)}
						/>
					}
					onClick={() =>
						setSetting("includeQuoteTweets", !settings.includeQuoteTweets)
					}
				/>
			</div>
		)
	);
}
