import { useState } from "react";
import Spinner from "@/entrypoints/popup/components/Spinner";
import { cn } from "@/src/helpers/cn";
import { messenger } from "@/src/helpers/messaging-extension";
import type { ExtensionDebugInfo, ExtensionState } from "@/src/helpers/state";
import type { FavedeckThemeExtensions, TwitterTheme } from "@/src/types/theme";
import AlertIcon from "~icons/mdi/alert-circle-outline";
import SadEmoji from "~icons/mdi/emoticon-sad-outline";
import { popupStorage } from "./storage";

function Dashboard(props: {
	state: ExtensionState;
	debugInfo?: ExtensionDebugInfo;
}) {
	return <>meow</>;
}

function OpenTwitterButton(props: { className?: string; hasTheme: boolean }) {
	return (
		<button
			onClick={() => {
				browser.tabs.create({ url: "https://x.com" });
			}}
			type="button"
			className={cn(
				"rounded-full cursor-pointer text-white font-bold bg-fd-bg-15! hover:shadow-lighten! py-2 px-6 text-center",
				props.hasTheme ? "text-fd-fg bg-fd-primary" : "text-white bg-[#1D9BF0]",
				props.className,
			)}
		>
			Open Twitter
		</button>
	);
}

function App() {
	const [state, setState] = useState<ExtensionState | undefined>(undefined);
	const [debugInfo, setDebugInfo] = useState<ExtensionDebugInfo | undefined>(
		undefined,
	);
	const [currentTab, setCurrentTab] = useState<Browser.tabs.Tab | undefined>(
		undefined,
	);
	const isTwitterTab =
		currentTab &&
		currentTab.id !== undefined &&
		["https://x.com", "https://twitter.com"].some((url) =>
			(currentTab.url ?? "").startsWith(url),
		);
	const [theme, setTheme] = useState<
		(TwitterTheme & FavedeckThemeExtensions) | null
	>(null);

	const appliedChirpFontRef = useRef(false);
	useEffect(() => {
		// set css variables
		if (!theme) return;
		document.documentElement.style.setProperty(
			"--fd-primary",
			theme.colors[theme.primaryColorName],
		);
		document.documentElement.style.setProperty(
			"--fd-bg",
			theme.colors.navigationBackground,
		);
		document.documentElement.style.setProperty("--fd-fg", theme.colors.text);

		if (appliedChirpFontRef.current) return;
		if (theme?.chirpFontStylesheet) {
			const stylesheet = document.createElement("style");
			stylesheet.innerHTML = theme.chirpFontStylesheet;
			document.head.appendChild(stylesheet);
			appliedChirpFontRef.current = true;
		}
	}, [theme]);

	useEffect(() => {
		popupStorage.getItem("lastSyncedTheme").then(setTheme);
	}, []);

	const initialized = useRef(false);
	useEffect(() => {
		if (initialized.current) return;
		(async () => {
			const [tab] = await browser.tabs.query({
				active: true,
				currentWindow: true,
			});
			setCurrentTab(tab);

			if (
				tab.id === undefined ||
				!["https://x.com", "https://twitter.com"].some((url) =>
					(tab.url ?? "").startsWith(url),
				)
			)
				return;

			messenger.onMessage("setState", (message) => setState(message.data));

			const { debugInfo, state, theme } = await messenger.sendMessage(
				"syncPopup",
				undefined,
				{ tabId: tab.id },
			);
			setDebugInfo(debugInfo);
			setState(state);
			setTheme(theme);
			await popupStorage.setItem("lastSyncedTheme", theme);
		})();
		initialized.current = true;
	}, []);

	if (!theme)
		return (
			<div className="w-md bg-black flex flex-col gap-2 p-8 justify-center items-center">
				<AlertIcon width={48} height={48} className="text-white" />
				<p className="text-white leading-none text-center">
					It seems like it's your first time opening this popup.
					<br />
					favedeck must be synced with Twitter at least once in order to display
					something useful.
				</p>
				<OpenTwitterButton className="mt-2" hasTheme={false} />
			</div>
		);
	if (!isTwitterTab)
		return (
			<div className="w-md bg-fd-bg flex flex-col gap-2 p-8 justify-center items-center">
				<SadEmoji width={48} height={48} className="text-fd-fg" />
				<p className="text-fd-fg leading-none text-center">
					It seems like this isn't a Twitter tab.
					<br />
					favedeck doesn't have anything useful to show here.
				</p>
				<OpenTwitterButton hasTheme />
			</div>
		);
	if (!state)
		return (
			<div className="w-screen h-screen bg-fd-bg flex p-8 justify-center items-center">
				<Spinner />
			</div>
		);
	return <Dashboard state={state} debugInfo={debugInfo} />;
}

export default App;
