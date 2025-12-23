import { TypedEventTarget } from "typescript-event-target";
import type { DatabaseDeck } from "../storage/definition";

interface DecksEventMap {
	"deck-created": CustomEvent<DatabaseDeck>;
	"deck-deleted": CustomEvent<DatabaseDeck>;
	"current-deck-changed": CustomEvent<string | null>;
}

class DecksEventTarget extends TypedEventTarget<DecksEventMap> {
	public currentDeck: string | null = null;

	public dispatchDeckCreated(deck: DatabaseDeck) {
		this.dispatchTypedEvent(
			"deck-created",
			new CustomEvent("deck-created", { detail: deck }),
		);
	}

	public dispatchDeckDeleted(deck: DatabaseDeck) {
		this.dispatchTypedEvent(
			"deck-deleted",
			new CustomEvent("deck-deleted", { detail: deck }),
		);
	}

	public setCurrentDeck(deck: string | null = null) {
		this.currentDeck = deck;
		this.dispatchTypedEvent(
			"current-deck-changed",
			new CustomEvent("current-deck-changed", { detail: deck }),
		);
	}
}

export const decksEventTarget = new DecksEventTarget();
