import { TypedEventTarget } from "typescript-event-target";
import type { DatabaseDeck } from "../storage/definition";

interface DecksEventMap {
	"deck-created": CustomEvent<DatabaseDeck>;
	"deck-deleted": CustomEvent<DatabaseDeck>;
}

class DecksEventTarget extends TypedEventTarget<DecksEventMap> {
	public latestCreatedDeck?: DatabaseDeck;
	public latestDeletedDeck?: DatabaseDeck;

	public dispatchDeckCreated(deck: DatabaseDeck) {
		this.latestCreatedDeck = deck;
		this.dispatchTypedEvent(
			"deck-created",
			new CustomEvent("deck-created", { detail: deck }),
		);
	}

	public dispatchDeckDeleted(deck: DatabaseDeck) {
		this.latestDeletedDeck = deck;
		this.dispatchTypedEvent(
			"deck-deleted",
			new CustomEvent("deck-deleted", { detail: deck }),
		);
	}
}

export const decksEventTarget = new DecksEventTarget();
