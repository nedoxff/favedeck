import { Dexie, type EntityTable } from "dexie";

export interface DatabaseTweet {
	user: string;
	deck: string;
	id: string;
	author: string;
	dateAdded: Date;
	thumbnail?: string;
}

export interface DatabaseDeck {
	user: string;
	id: string;
	name: string;
	secret: boolean;
	dateModified: Date;
}

export interface DatabaseCompressedEntity {
	key: string;
	type: string;
	data: Blob;
	meta?: object;
}

export const db = new Dexie("favedeck") as Dexie & {
	tweets: EntityTable<DatabaseTweet>;
	decks: EntityTable<DatabaseDeck, "id">;
	kv: EntityTable<{ key: string; value: unknown }, "key">;
	entities: EntityTable<DatabaseCompressedEntity, "key">;
};

db.version(1).stores({
	tweets: "++, id, user, author, deck, dateAdded, thumbnail",
	decks: "&id, user, name, secret, dateModified",
	kv: "&key, value",
	entities: "&key, type, meta.quoteOf, meta.user",
});
