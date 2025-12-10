import { Dexie, type EntityTable } from "dexie";

export interface DatabaseTweet {
	user: string;
	deck: string;
	id: string;
	data: Blob;
}

export interface DatabaseDeck {
	user: string;
	id: string;
	name: string;
}

export const db = new Dexie("favedeck") as Dexie & {
	tweets: EntityTable<DatabaseTweet>;
	decks: EntityTable<DatabaseDeck, "id">;
	kv: EntityTable<{ key: string; value: unknown }, "key">;
};

db.version(1).stores({
	tweets: "++, id, user, deck",
	decks: "&id, user, name",
	kv: "&key, value",
});
