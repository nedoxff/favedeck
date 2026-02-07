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
			</div>
		)
	);
}
