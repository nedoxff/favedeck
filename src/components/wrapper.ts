export let components: {
	SelectDeckPopup: typeof import("./SelectDeckPopup").SelectDeckPopup;
	DeckViewer: typeof import("./deck-viewer/DeckViewer").DeckViewer;
	Toast: typeof import("./Toast").Toast;
	BackupDetectedModal: typeof import("./BackupDetectedModal").BackupDetectedModal;
};

export const initializeComponents = async () => {
	components = {
		SelectDeckPopup: (await import("./SelectDeckPopup")).SelectDeckPopup,
		DeckViewer: (await import("./deck-viewer/DeckViewer")).DeckViewer,
		Toast: (await import("./Toast")).Toast,
		BackupDetectedModal: (await import("./BackupDetectedModal"))
			.BackupDetectedModal,
	};
	console.log("initialized modules", components);
};
