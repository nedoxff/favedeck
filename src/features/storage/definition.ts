import { Dexie, type EntityTable } from "dexie";

interface Tweet {
	user: number;
	deck: string;
	id: number;
	data: string;
}

interface Deck {
	user: number;
	id: string;
	name: string;
}

export const db = new Dexie("favedeck") as Dexie & {
	tweets: EntityTable<Tweet>;
	decks: EntityTable<Deck>;
};

db.version(1).stores({
	tweets: "++, id, user, deck",
	decks: "&id, user, name",
});
