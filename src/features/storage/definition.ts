import { Dexie, type EntityTable } from "dexie";

interface Tweet {
	user: number;
	board: string;
	id: number;
	data: string;
}

interface Board {
	user: number;
	id: string;
	name: string;
}

export const db = new Dexie("favedeck") as Dexie & {
	tweets: EntityTable<Tweet>;
	boards: EntityTable<Board>;
};

db.version(1).stores({
	tweets: "++, id, user, board",
	boards: "&id, user, name",
});