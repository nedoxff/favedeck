import { Dexie, type EntityTable } from "dexie";

export interface DatabaseTweet {
	user: string;
	deck: string;
	id: string;
	data: Blob;
	added: Date;
	thumbnail?: string;
}

export interface DatabaseDeck {
	user: string;
	id: string;
	name: string;
	secret: boolean;
}

export const db = new Dexie("favedeck") as Dexie & {
	tweets: EntityTable<DatabaseTweet>;
	decks: EntityTable<DatabaseDeck, "id">;
	kv: EntityTable<{ key: string; value: unknown }, "key">;
};

db.version(1).stores({
	tweets: "++, id, user, deck, added, thumbnail",
	decks: "&id, user, name, secret",
	kv: "&key, value",
});
