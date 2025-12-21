export let components: {
	SelectDeckPopup: typeof import("./SelectDeckPopup").SelectDeckPopup;
	DeckViewer: typeof import("./deck-viewer/DeckViewer").DeckViewer;
};

export const initializeComponents = async () => {
	components = {
		SelectDeckPopup: (await import("./SelectDeckPopup")).SelectDeckPopup,
		DeckViewer: (await import("./deck-viewer/DeckViewer")).DeckViewer,
	};
	console.log("initialized modules", components);
};
