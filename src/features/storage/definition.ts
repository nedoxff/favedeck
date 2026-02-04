import { Dexie, type EntityTable, type Table } from "dexie";

export interface DatabaseTweet {
	user: string;
	deck: string;
	id: string;
	dateAdded: Date;
	thumbnail?: string;
	order: number;
}

export interface DatabaseDeck {
	user: string;
	id: string;
	name: string;
	secret: boolean;
	dateModified: Date;
	viewMode: "regular" | "masonry";
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
	payload: Blob;
}

export const db = new Dexie("favedeck") as Dexie & {
	tweets: Table<DatabaseTweet, [string, string, string]>;
	decks: EntityTable<DatabaseDeck, "id">;
	kv: EntityTable<{ key: string; value: unknown }, "key">;
	entities: EntityTable<DatabaseCompressedEntity, "key">;
	potentiallyUngrouped: Table<
		DatabasePotentiallyUngroupedTweet,
		[string, string]
	>;
};

db.version(1).stores({
	tweets: "[id+user+deck], id, user, deck, [deck+order+dateAdded]",
	decks: "&id, user, order",
	kv: "&key, value",
	entities: "&key, type, meta.quoteOf, meta.user",
	potentiallyUngrouped: "[id+user]",
});
