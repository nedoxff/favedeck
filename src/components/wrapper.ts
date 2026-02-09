export let components: {
	SelectDeckPopup: typeof import("./SelectDeckPopup").SelectDeckPopup;
	DeckViewer: typeof import("./deck-viewer/DeckViewer").DeckViewer;
	Toast: typeof import("./Toast").Toast;
};

export const initializeComponents = async () => {
	components = {
		SelectDeckPopup: (await import("./SelectDeckPopup")).SelectDeckPopup,
		DeckViewer: (await import("./deck-viewer/DeckViewer")).DeckViewer,
		Toast: (await import("./Toast")).Toast,
	};
	console.log("initialized modules", components);
};
