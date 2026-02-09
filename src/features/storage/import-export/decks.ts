import {
	BlobReader,
	BlobWriter,
	TextReader,
	TextWriter,
	ZipReader,
	ZipWriter,
} from "@zip.js/zip.js";
import { Result } from "better-result";
import Dexie from "dexie";
import { getProperty } from "dot-prop";
import { getUserId } from "@/src/internals/foolproof";
import type { AddEntitiesPayload } from "@/src/internals/redux";
import type { RawTweet } from "@/src/types/tweet";
import { getAllDeckTweets, getDeck } from "../decks";
import { type DatabaseDeck, type DatabaseTweet, db } from "../definition";
import { getTweetEntityPayloadFromDatabase, putTweetEntity } from "../entities";
import { removePotentiallyUngroupedTweet } from "../potentially-ungrouped";
import { createMigrationSystem, type MigrationSystem } from "./migrations";

type DeckImporterExporterMeta = {
	version: number;
	exporter: string;
};

// current structure:
// db/
//  deck.json
//  tweets/
//   {id}.json
// entities/
// 	tweets/
// 	 {id}.json
//   meta.json
//  users/
//   {id}.json
// meta.json

const VERSION = 1;
export const deckImporterExporter: MigrationSystem<Blob> & {
	export: (id: string) => Promise<Result<Blob, Error>>;
	import: (blob: Blob) => Promise<Result<DatabaseDeck, Error>>;
} = (() => {
	const migrations = createMigrationSystem<Blob>({
		determineVersion: async (blob) =>
			Result.tryPromise(async () => {
				const zipReader = new ZipReader(new BlobReader(blob));
				const metaEntry = (await zipReader.getEntries()).find(
					(e) => e.filename === "meta.json",
				);
				if (!metaEntry || metaEntry.directory)
					throw new Error(
						"Couldn't find a meta.json inside the archive to determine the version",
					);
				const metaWriter = new TextWriter();
				await metaEntry.getData(metaWriter);

				const meta = JSON.parse(await metaWriter.getData());
				const version = getProperty(meta, "version") as number | undefined;
				if (!version)
					throw new Error(
						"Couldn't find the version property inside meta.json",
					);
				return version;
			}),
		version: VERSION,
		migrations: [],
	});
	return {
		...migrations,
		export: (id) =>
			Result.tryPromise(async () => {
				const deck = await getDeck(id);
				if (!deck)
					throw new Error(`Deck ${id} cannot be exported (it doesn't exist)`);
				const tweets = await getAllDeckTweets(id).toArray();

				const zipWriter = new ZipWriter(new BlobWriter());
				for (const directory of [
					"db",
					"db/tweets",
					"entities",
					"entities/tweets",
					"entities/users",
				])
					await zipWriter.add(directory, undefined, { directory: true });

				await zipWriter.add(
					"meta.json",
					new TextReader(
						JSON.stringify(
							{
								version: VERSION,
								exporter: deck.user,
							} satisfies DeckImporterExporterMeta,
							undefined,
							4,
						),
					),
				);
				await zipWriter.add(
					"db/deck.json",
					new TextReader(JSON.stringify(deck, undefined, 4)),
				);

				const seenTweets = new Set<string>();
				const seenUsers = new Set<string>();
				let tweetsMeta: Required<AddEntitiesPayload["favedeck"]> = {
					quoteOf: {},
					user: {},
				};
				for (const tweet of tweets) {
					await zipWriter.add(
						`db/tweets/${tweet.id}.json`,
						new TextReader(JSON.stringify(tweet)),
					);
					const payload = await getTweetEntityPayloadFromDatabase(tweet.id);
					// TODO: maybe return error instead of just warn? idk
					if (payload.isErr()) {
						console.warn(
							"failed to get payload for tweet",
							tweet.id,
							"when exporting deck",
							deck,
						);
						continue;
					}

					tweetsMeta = {
						quoteOf: {
							...tweetsMeta.quoteOf,
							...(payload.value.favedeck?.quoteOf ?? {}),
						},
						user: {
							...tweetsMeta.user,
							...(payload.value.favedeck?.user ?? {}),
						},
					};

					for (const [id, entity] of Object.entries(
						payload.value.tweets ?? {},
					)) {
						if (seenTweets.has(id)) continue;
						seenTweets.add(id);
						await zipWriter.add(
							`entities/tweets/${id}.json`,
							new TextReader(JSON.stringify(entity)),
						);
					}

					for (const [id, entity] of Object.entries(
						payload.value.users ?? {},
					)) {
						if (seenUsers.has(id)) continue;
						seenUsers.add(id);
						await zipWriter.add(
							`entities/users/${id}.json`,
							new TextReader(JSON.stringify(entity)),
						);
					}
				}
				await zipWriter.add(
					"entities/tweets/meta.json",
					new TextReader(JSON.stringify(tweetsMeta)),
				);

				return await zipWriter.close();
			}),
		import: (blob) =>
			Result.tryPromise(async () => {
				const migratedBlob = await migrations.migrateIfNeeded(blob);
				if (migratedBlob.isErr())
					throw new Error("Couldn't import deck due to a failed migration", {
						cause: migratedBlob.error,
					});

				const zipReader = new ZipReader(new BlobReader(migratedBlob.value));
				const entries = await zipReader.getEntries();

				const readEntry = async (filename: string) => {
					const entry = entries.find((e) => e.filename === filename);
					if (!entry || entry.directory)
						throw new Error(
							`Expected to find ${filename} in the archive but it isn't there`,
						);
					const writer = new TextWriter();
					await entry.getData(writer);
					return await writer.getData();
				};

				const user = await getUserId();
				if (!user) throw new Error("Couldn't get user ID");

				const meta = JSON.parse(
					await readEntry("meta.json"),
				) as DeckImporterExporterMeta;
				if (meta.exporter !== user)
					throw new Error(
						`Exporter doesn't match the user ID (${user} ≠ ${meta.exporter})`,
					);

				let deck = JSON.parse(await readEntry("db/deck.json")) as DatabaseDeck;

				if ((await getDeck(deck.id))?.dateModified ?? 0 >= deck.dateModified)
					throw new Error(
						"The deck already seems to have been imported and/or modified. If you wish to overwrite it, please delete the deck before importing.",
					);

				deck = {
					...deck,
					user,
					dateModified: Date.now(),
					order: Dexie.minKey,
				};
				await db.decks.put(deck);

				for (const entry of entries.filter((e) =>
					e.filename.startsWith("db/tweets/"),
				)) {
					if (entry.directory) continue;
					const tweet = JSON.parse(
						await readEntry(entry.filename),
					) as DatabaseTweet;
					await db.tweets.put({
						...tweet,
						user,
						dateAdded: Date.now(),
						order: tweet.order ?? Dexie.minKey,
					});
				}

				const tweetsMeta = JSON.parse(
					await readEntry("entities/tweets/meta.json"),
				) as NonNullable<AddEntitiesPayload["favedeck"]>;
				for (const entry of entries.filter(
					(e) =>
						e.filename.startsWith("entities/tweets/") &&
						e.filename !== "entities/tweets/meta.json",
				)) {
					if (entry.directory) continue;
					const tweet = JSON.parse(await readEntry(entry.filename)) as RawTweet;
					const user = JSON.parse(
						await readEntry(`entities/users/${tweet.user}.json`),
					);
					await putTweetEntity(tweet, user, tweetsMeta.quoteOf[tweet.id_str]);
					await removePotentiallyUngroupedTweet(tweet.id_str);
				}

				return deck;
			}),
	};
})();
