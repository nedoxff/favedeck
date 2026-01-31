import "@/assets/popup.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { messenger } from "@/src/helpers/messaging-extension.ts";
import App from "./App.tsx";
import { usePopupState } from "./state.ts";
import { popupStorage } from "./storage.ts";

(async () => {
	const currentTab = (
		await browser.tabs.query({ active: true, currentWindow: true })
	)[0];
	const theme = await popupStorage.getItem("lastSyncedTheme");

	usePopupState.setState({
		currentTab,
		theme,
	});

	messenger.onMessage("setState", (message) => {
		console.log(message.data);
		usePopupState.setState({ state: message.data });
	});
	if (currentTab?.id)
		messenger
			.sendMessage("syncPopup", undefined, { tabId: currentTab.id })
			.then(({ debugInfo, state, theme }) => {
				usePopupState.setState({ debugInfo, state, theme });
				popupStorage.setItem("lastSyncedTheme", theme);
			});
})();

// biome-ignore lint/style/noNonNullAssertion: this script is only loaded when root is already present
ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
);
