import { Dexie, type EntityTable, type Table } from "dexie";
import { getProperty } from "dot-prop";
import { kv } from "./kv";

export interface DatabaseTweet {
	user: string;
	deck: string;
	id: string;
	dateAdded: number;
	thumbnail?: string;
	order: number;
}

export interface DatabaseDeck {
	user: string;
	id: string;
	name: string;
	secret: boolean;
	dateModified: number;
	viewMode: "regular" | "masonry";
	category: "bookmarks" | "likes";
	order: number;
}

export interface DatabaseCompressedEntity {
	key: string;
	type: string;
	data: Blob;
	meta?: object;
}

export interface DatabasePotentiallyUngroupedTweet {
	id: string;
	user: string;
	category:
		| "unbookmarked"
		| "unliked"
		| "intentional_bookmarks"
		| "intentional_likes";
	payload: Blob;
}

Dexie.on("storagemutated", async (parts) => {
	const ignoredFields = ["lastBackupTimestamp", "changesSinceLastBackup"];
	const ignoreMutation = Object.values(parts).some(
		(p) =>
			ignoredFields.includes(getProperty(p, "from")) ||
			ignoredFields.includes(getProperty(p, "to")),
	);
	if (((await kv.changesSinceLastBackup.get()) ?? false) || ignoreMutation)
		return;
	console.log("toggling changesSinceLastBackup", parts);
	await kv.changesSinceLastBackup.set(true);
});

export const db = new Dexie("favedeck") as Dexie & {
	tweets: Table<DatabaseTweet, [string, string, string]>;
	decks: EntityTable<DatabaseDeck, "id">;
	kv: EntityTable<{ key: string; value: unknown }, "key">;
	entities: EntityTable<DatabaseCompressedEntity, "key">;
	potentiallyUngrouped: Table<
		DatabasePotentiallyUngroupedTweet,
		[string, string, string]
	>;
};

db.version(1).stores({
	tweets: "[id+user+deck], id, user, deck, [deck+order+dateAdded]",
	decks: "&id, user, order",
	kv: "&key, value",
	entities: "&key, type, meta.quoteOf, meta.user",
	potentiallyUngrouped: "[id+user], [user+category]",
});

db.version(2)
	.stores({
		potentiallyUngrouped: null,
		potentiallyUngrouped_temp: "[id+user+category], [user+category]",
	})
	.upgrade(async (tx) => {
		const records = await tx
			.table<DatabasePotentiallyUngroupedTweet>("potentiallyUngrouped")
			.toArray();
		await tx
			.table<DatabasePotentiallyUngroupedTweet>("potentiallyUngrouped_temp")
			.bulkAdd(records);

		await tx
			.table<DatabaseDeck>("decks")
			.toCollection()
			.modify((deck) => {
				deck.category = "bookmarks";
			});
	});

db.version(3)
	.stores({
		potentiallyUngrouped: "[id+user+category], [user+category]",
		potentiallyUngrouped_temp: null,
	})
	.upgrade(async (tx) => {
		const records = await tx
			.table<DatabasePotentiallyUngroupedTweet>("potentiallyUngrouped_temp")
			.toArray();
		await tx
			.table<DatabasePotentiallyUngroupedTweet>("potentiallyUngrouped")
			.bulkAdd(records);
	});
