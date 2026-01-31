import { useState } from "react";
import Spinner from "@/entrypoints/popup/components/Spinner";
import FoldersLogo from "@/public/img/icons/folders-colored.svg?react";
import MartenLogo from "@/public/img/icons/marten-colored.svg?react";
import { cn } from "@/src/helpers/cn";
import { messenger } from "@/src/helpers/messaging-extension";
import type {
	ExtensionDebugInfo,
	ExtensionState,
	ExtensionStateGroups,
} from "@/src/helpers/state";
import type { FavedeckThemeExtensions, TwitterTheme } from "@/src/types/theme";
import AlertIcon from "~icons/mdi/alert-circle-outline";
import CheckIcon from "~icons/mdi/check";
import Circle from "~icons/mdi/circle";
import SadEmoji from "~icons/mdi/emoticon-sad-outline";
import { usePopupState } from "./state";
import { popupStorage } from "./storage";

function DashboardStateGroup(props: {
	state: ExtensionState;
	group: keyof Omit<ExtensionStateGroups, symbol>;
}) {
	const group = props.state.groups[props.group];
	useEffect(() => {
		if (group.status === "error") console.error(group.error);
	}, []);

	const title = useMemo(() => {
		switch (props.group) {
			case "webpack":
				return (
					<span
						className="underline decoration-dotted cursor-help"
						title="The core component for favedeck."
					>
						Webpack
					</span>
				);
			case "redux":
			case "tweetComponent":
			case "messageListener":
			case "fiberObserver":
			case "tweetObserver":
			case "urlObserver":
				return props.group;
		}
	}, [props.group]);

	const description = useMemo(() => {
		switch (group.status) {
			case "loading":
				return <Spinner size="small" />;
			case "ok":
				return (
					<div className="flex flex-row items-center">
						<CheckIcon width={24} />
						<p>OK</p>
					</div>
				);
			case "error":
				return (
					<div className="flex flex-row items-center">
						<AlertIcon width={24} />
						<p>Error</p>
					</div>
				);
		}
	}, [group]);

	return (
		<div className="flex flex-row items-center gap-2">
			<p>{title}:</p>
			{description}
		</div>
	);
}

function Dashboard(props: {
	state: ExtensionState;
	debugInfo?: ExtensionDebugInfo;
}) {
	return (
		<div className="w-md bg-fd-bg flex flex-col">
			<div className="p-4 flex flex-col gap-4">
				<details open className="text-fd-fg">
					<summary className="font-medium text-xl">State</summary>

					{!props.state.fine && (
						<p className="mt-2 font-semibold text-center bg-fd-danger/25 p-2 rounded-md">
							The extension is not guaranteed to work properly!
						</p>
					)}
					<div className="flex flex-col mt-2">
						{Object.keys(props.state.groups).map((key) => (
							<DashboardStateGroup
								key={key}
								group={key as keyof Omit<ExtensionStateGroups, symbol>}
								state={props.state}
							/>
						))}
					</div>
				</details>
				{props.debugInfo && (
					<details className="text-fd-fg">
						<summary className="font-medium text-xl">Debug information</summary>
						<div className="flex flex-col items-start gap-1 mt-2">
							<p>
								Twitter is being rendered with React{" "}
								<span className="font-mono bg-fd-primary/50 rounded-md p-1">
									v{props.debugInfo.reactVersion}
								</span>
							</p>
							<button
								onClick={() => {
									browser.tabs.create({ url: "https://x.com" });
								}}
								type="button"
								className={
									"rounded-full cursor-pointer font-bold py-2 px-6 text-center bg-fd-primary hover:bg-fd-primary/90"
								}
							>
								Copy debug information
							</button>
						</div>
					</details>
				)}
			</div>
			<hr className="border-t border-fd-fg/25" />
			<div className="flex flex-row items-end p-2 gap-2">
				<MartenLogo width={48} className="text-fd-primary" />
				<div className="flex flex-col">
					<p className="text-fd-fg text-2xl font-bold leading-none">favedeck</p>
					<p className="opacity-50 text-sm text-fd-fg flex flex-row items-center gap-1">
						{import.meta.env.VITE_APP_VERSION} <Circle width={4} height={4} />
						<button
							type="button"
							onClick={() => {
								browser.tabs.update({
									url: "https://x.com/i/bookmarks#fd-about",
								});
								window.close();
							}}
							className="underline cursor-pointer"
						>
							about
						</button>
					</p>
				</div>
			</div>
		</div>
	);
}

function OpenTwitterButton(props: { className?: string; hasTheme: boolean }) {
	return (
		<button
			onClick={() => {
				browser.tabs.create({ url: "https://x.com" });
			}}
			type="button"
			className={cn(
				"rounded-full cursor-pointer text-white font-bold py-2 px-6 text-center",
				props.hasTheme
					? "text-fd-fg bg-fd-primary hover:bg-fd-primary/90"
					: "text-white bg-[#1D9BF0] hover:bg-[#1D9BF0]/90",
				props.className,
			)}
		>
			Open Twitter
		</button>
	);
}

function App() {
	const { theme, currentTab, debugInfo, state } = usePopupState();

	const isTwitterTab =
		currentTab &&
		currentTab.id !== undefined &&
		["https://x.com", "https://twitter.com"].some((url) =>
			(currentTab.url ?? "").startsWith(url),
		);

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
		document.documentElement.style.setProperty(
			"--fd-danger",
			theme.colors.red500,
		);

		if (appliedChirpFontRef.current) return;
		if (theme?.chirpFontStylesheet) {
			const stylesheet = document.createElement("style");
			stylesheet.innerHTML = theme.chirpFontStylesheet;
			document.head.appendChild(stylesheet);
			appliedChirpFontRef.current = true;
		}
	}, [theme]);

	console.log(theme, isTwitterTab, state);
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
