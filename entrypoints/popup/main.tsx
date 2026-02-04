import "@/assets/popup.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { messenger } from "@/src/helpers/messaging-extension.ts";
import App from "./App.tsx";
import { usePopupState } from "./helpers/state.ts";
import { popupStorage } from "./helpers/storage.ts";

(async () => {
	const currentTab = (
		await browser.tabs.query({ active: true, currentWindow: true })
	)[0];
	const theme = await popupStorage.getItem("lastSyncedTheme");

	usePopupState.setState({
		currentTab,
		theme,
	});

	let syncedPopup = false;
	const trySyncPopup = () => {
		if (!currentTab.id || syncedPopup) return;
		messenger
			.sendMessage("syncPopup", undefined, { tabId: currentTab.id })
			.then(({ debugInfo, state, theme }) => {
				usePopupState.setState((cur) => ({
					debugInfo,
					state,
					theme: theme ? theme : cur.theme,
				}));
				syncedPopup = true;
				if (theme) popupStorage.setItem("lastSyncedTheme", theme);
			});
	};

	messenger.onMessage("setState", (message) => {
		usePopupState.setState({ state: message.data });
		trySyncPopup();
	});
	if (currentTab?.id) trySyncPopup();
})();

// biome-ignore lint/style/noNonNullAssertion: this script is only loaded when root is already present
ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
);
