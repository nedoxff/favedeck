import { Dexie, type EntityTable } from "dexie";

export interface Tweet {
	user: number;
	deck: string;
	id: number;
	data: string;
}

export interface Deck {
	user: number;
	id: string;
	name: string;
}

export const db = new Dexie("favedeck") as Dexie & {
	tweets: EntityTable<Tweet>;
	decks: EntityTable<Deck, "id">;
	kv: EntityTable<{ key: string; value: unknown }, "key">;
};

db.version(1).stores({
	tweets: "++, id, user, deck",
	decks: "&id, user, name",
	kv: "&key, value",
});
