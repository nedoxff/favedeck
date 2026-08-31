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
import {
	type DatabaseCompressedEntity,
	type DatabaseDeck,
	type DatabasePotentiallyUngroupedTweet,
	type DatabaseTweet,
	db,
} from "../definition";
import { createMigrationSystem, type MigrationSystem } from "./migrations";

type BackupMigrationMeta = {
	version: number;
	databaseVersion: number;
	exporter: string;
};

/*
    entities/
        {id}.dat
    potentially_ungrouped_payloads/
        {id}.dat
    db/
        entities.json
        kv.json
        potentially_ungrouped.json
        decks.json
        tweets.json
    meta.json
*/

export type BackupArchiveInformation = {
	sameUser: boolean;
	decks: DatabaseDeck[];
	containsKV: boolean;
	containsPotentiallyUngrouped: boolean;
};

export type BackupOptions = {
	exclude: {
		decks: string[];
		potentiallyUngrouped: boolean;
		kv: boolean;
	};
};
export const FULL_BACKUP_OPTIONS: BackupOptions = {
	exclude: { decks: [], kv: false, potentiallyUngrouped: false },
};

const VERSION = 1;
export const backupSystem: MigrationSystem<Blob> & {
	create: (
		options: BackupOptions,
		writer: ConstructorParameters<typeof ZipWriter>[0],
	) => Promise<Result<void, Error>>;
	analyze: (blob: Blob) => Promise<Result<BackupArchiveInformation, Error>>;
	restore: (blob: Blob, options: BackupOptions) => Promise<Result<void, Error>>;
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
		create: (options, writer) =>
			Result.tryPromise(async () => {
				const zipWriter = new ZipWriter(writer);
				for (const directory of [
					"db",
					"entities",
					"potentially_ungrouped_payloads",
				])
					await zipWriter.add(directory, undefined, { directory: true });

				await zipWriter.add(
					"meta.json",
					new TextReader(
						JSON.stringify(
							{
								version: VERSION,
								databaseVersion: db.verno,
								exporter: (await getUserId()) ?? "",
							} satisfies BackupMigrationMeta,
							undefined,
							4,
						),
					),
				);

				const addObject = async (filename: string, what: unknown) =>
					await zipWriter.add(filename, new TextReader(JSON.stringify(what)));

				if (!options.exclude.kv) {
					await addObject("db/kv.json", await db.kv.toArray());
				}

				const filteredTweets = (await db.tweets.toArray()).filter(
					(t) => !options.exclude.decks.includes(t.deck),
				);
				const filteredDecks = (await db.decks.toArray()).filter(
					(d) => !options.exclude.decks.includes(d.id),
				);
				await addObject("db/tweets.json", filteredTweets);
				await addObject("db/decks.json", filteredDecks);

				const allEntities = await db.entities.toArray();
				const filteredEntities = allEntities.filter((e) => {
					const [type, id] = e.key.split("-");
					switch (type) {
						case "tweet": {
							return (
								filteredTweets.some((t) => t.id === id) ||
								allEntities.some((e1) => {
									const [, otherId] = e1.key.split("-");
									const quoteOf = getProperty(e1.meta, "quoteOf") as
										| string
										| undefined;
									return (
										quoteOf === id &&
										filteredTweets.some((t) => t.id === otherId)
									);
								})
							);
						}

						case "user": {
							return filteredTweets
								.map((t) => allEntities.find((e) => e.key === `tweet-${t.id}`))
								.some((e) => {
									return (
										(getProperty(e?.meta, "user") as string | undefined) === id
									);
								});
						}
						default:
							throw new Error(`Unknown entity type "${type}"`);
					}
				});
				await addObject(
					"db/entities.json",
					filteredEntities.map((entry) => {
						const { data, ...filteredEntry } = entry;
						return filteredEntry;
					}),
				);
				for (const entity of filteredEntities)
					await zipWriter.add(
						`entities/${entity.key}.dat`,
						new BlobReader(entity.data),
					);

				if (!options.exclude.potentiallyUngrouped) {
					const potentiallyUngrouped = await db.potentiallyUngrouped.toArray();
					await addObject(
						"db/potentially_ungrouped.json",
						potentiallyUngrouped.map((entry) => {
							const { payload, ...filteredEntry } = entry;
							return filteredEntry;
						}),
					);
					for (const entity of potentiallyUngrouped)
						await zipWriter.add(
							`potentially_ungrouped_payloads/${entity.id}-${entity.user}.dat`,
							new BlobReader(entity.payload),
						);
				}

				await zipWriter.close();
			}),
		restore: (blob, options) =>
			Result.tryPromise(async () => {
				const migratedBlob = await migrations.migrateIfNeeded(blob);
				if (migratedBlob.isErr())
					throw new Error("Couldn't restore backup due to a failed migration", {
						cause: migratedBlob.error,
					});

				const zipReader = new ZipReader(new BlobReader(migratedBlob.value));
				const entries = await zipReader.getEntries();

				const readEntryToString = async (
					filename: string,
					fallback?: string,
				) => {
					const entry = entries.find((e) => e.filename === filename);
					if (!entry || entry.directory) {
						if (!fallback)
							throw new Error(
								`Expected to find ${filename} in the archive but it isn't there`,
							);
						return fallback;
					}

					const writer = new TextWriter();
					await entry.getData(writer);
					return await writer.getData();
				};
				const readEntryToBlob = async (filename: string, fallback?: Blob) => {
					const entry = entries.find((e) => e.filename === filename);
					if (!entry || entry.directory) {
						if (!fallback)
							throw new Error(
								`Expected to find ${filename} in the archive but it isn't there`,
							);
						return fallback;
					}

					const writer = new BlobWriter();
					await entry.getData(writer);
					return await writer.getData();
				};
				const readAndParseEntry = async <T>(filename: string, fallback?: T) =>
					JSON.parse(
						await readEntryToString(
							filename,
							fallback ? JSON.stringify(fallback) : undefined,
						),
					) as T;

				const user = await getUserId();
				if (!user) throw new Error("Couldn't get user ID");

				const meta = await readAndParseEntry<BackupMigrationMeta>("meta.json");
				if (meta.exporter !== user)
					throw new Error(
						`Exporter doesn't match the user ID (${user} ≠ ${meta.exporter})`,
					);

				const files = {
					kv: await readAndParseEntry<{ key: string; value: unknown }[]>(
						"db/kv.json",
						[],
					),
					tweets: await readAndParseEntry<DatabaseTweet[]>(
						"db/tweets.json",
						[],
					),
					decks: await readAndParseEntry<DatabaseDeck[]>("db/decks.json", []),
					entities:
						await readAndParseEntry<Omit<DatabaseCompressedEntity, "data">[]>(
							"db/entities.json",
						),
					potentiallyUngrouped: await readAndParseEntry<
						Omit<DatabasePotentiallyUngroupedTweet, "payload">[]
					>("db/potentially_ungrouped.json", []),
				};

				const binaries = {
					entities: await Promise.all(
						files.entities.map((e) => readEntryToBlob(`entities/${e.key}.dat`)),
					),
					potentiallyUngroupedPayloads: await Promise.all(
						files.potentiallyUngrouped.map((pu) =>
							readEntryToBlob(
								`potentially_ungrouped_payloads/${pu.id}-${pu.user}.dat`,
							),
						),
					),
				};

				await db
					.transaction(
						"rw",
						[db.kv, db.potentiallyUngrouped, db.entities, db.tweets, db.decks],
						async (tx) => {
							if (!options.exclude.kv) await tx.kv.bulkPut(files.kv);

							const filteredTweets = files.tweets.filter(
								(t) => !options.exclude.decks.includes(t.deck),
							);
							const filteredDecks = files.decks.filter(
								(d) => !options.exclude.decks.includes(d.id),
							);

							await tx.tweets.bulkPut(
								filteredTweets.map((t) => ({
									...t,
									dateAdded: Date.now(),
									order: t.order ?? Dexie.minKey,
								})),
							);
							await tx.decks.bulkPut(
								filteredDecks.map((d) => ({
									...d,
									dateModified: Date.now(),
									order: d.order ?? Dexie.minKey,
								})),
							);

							// remove old potentially ungrouped tweets
							for (const user of new Set(filteredTweets.map((t) => t.user))) {
								for (const category of ["unbookmarked", "unliked"]) {
									const noLongerUngroupedTweets = filteredTweets.filter(
										(t) =>
											t.user === user &&
											filteredDecks.find((d) => d.id === t.deck)?.category ===
												(category === "unbookmarked" ? "bookmarks" : "likes"),
									);
									if (!noLongerUngroupedTweets.length) continue;
									console.log(
										"no longer ungrouped tweets",
										user,
										category,
										noLongerUngroupedTweets,
									);
									await tx.potentiallyUngrouped
										.where("[id+user+category]")
										.anyOf(
											noLongerUngroupedTweets.map((t) => [
												t.id,
												user,
												category,
											]),
										)
										.delete();
								}
							}

							for (let i = 0; i < files.entities.length; i++) {
								const completedEntity = {
									...files.entities[i],
									data: binaries.entities[i],
								} satisfies DatabaseCompressedEntity;

								const [type, id] = completedEntity.key.split("-");
								switch (type) {
									case "tweet": {
										if (
											!(
												filteredTweets.some((t) => t.id === id) ||
												files.entities.some((e1) => {
													const [, otherId] = e1.key.split("-");
													const quoteOf = getProperty(e1.meta, "quoteOf") as
														| string
														| undefined;
													return (
														quoteOf === id &&
														filteredTweets.some((t) => t.id === otherId)
													);
												})
											)
										)
											continue;
										break;
									}

									case "user": {
										if (
											!filteredTweets
												.map((t) =>
													files.entities.find((e) => e.key === `tweet-${t.id}`),
												)
												.some((e) => {
													return (
														(getProperty(e?.meta, "user") as
															| string
															| undefined) === id
													);
												})
										)
											continue;
										break;
									}
									default:
										throw new Error(`Unknown entity type "${type}"`);
								}

								await tx.entities.put(completedEntity);
							}

							if (!options.exclude.potentiallyUngrouped) {
								for (let i = 0; i < files.potentiallyUngrouped.length; i++) {
									const completedEntity = {
										...files.potentiallyUngrouped[i],
										payload: binaries.potentiallyUngroupedPayloads[i],
									} satisfies DatabasePotentiallyUngroupedTweet;
									await tx.potentiallyUngrouped.put(completedEntity);
								}
							}
						},
					)
					.catch((err) => {
						throw new Error("Database transaction failed", { cause: err });
					});
			}),
		analyze: (blob) =>
			Result.tryPromise(async () => {
				const migratedBlob = await migrations.migrateIfNeeded(blob);
				if (migratedBlob.isErr())
					throw new Error("Couldn't analyze backup due to a failed migration", {
						cause: migratedBlob.error,
					});

				const zipReader = new ZipReader(new BlobReader(migratedBlob.value));
				const entries = await zipReader.getEntries();
				let writer = new TextWriter();

				const metaEntry = entries.find((e) => e.filename === "meta.json");
				if (!metaEntry || metaEntry.directory)
					throw new Error(
						"Expected to find meta.json in the archive but it wasn't there",
					);
				await metaEntry.getData(writer);
				const meta = JSON.parse(await writer.getData()) as BackupMigrationMeta;

				const decksEntry = entries.find((e) => e.filename === "db/decks.json");
				if (!decksEntry || decksEntry.directory)
					throw new Error(
						"Expected to find db/decks.json in the archive but it wasn't there",
					);
				writer = new TextWriter();
				await decksEntry.getData(writer);
				const decks = JSON.parse(await writer.getData()) as DatabaseDeck[];

				return {
					containsKV: entries.some((e) => e.filename === "db/kv.json"),
					containsPotentiallyUngrouped: entries.some(
						(e) => e.filename === "db/potentially_ungrouped.json",
					),
					decks,
					sameUser: meta.exporter === ((await getUserId()) ?? ""),
				} satisfies BackupArchiveInformation;
			}),
	};
})();
