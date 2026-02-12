import { useEffect, useMemo, useRef, useState } from "react";
import MartenLogo from "@/public/img/icons/marten-colored.svg?react";
import SimpleTooltip from "@/src/components/common/SimpleTooltip";
import Spinner from "@/src/components/common/Spinner";
import { cn } from "@/src/helpers/cn";
import { createDebugInfoReport } from "@/src/helpers/reports";
import type {
	ExtensionDebugInfo,
	ExtensionState,
	ExtensionStateGroups,
} from "@/src/helpers/state";
import AlertIcon from "~icons/mdi/alert-circle-outline";
import CheckIcon from "~icons/mdi/check";
import Circle from "~icons/mdi/circle";
import SadEmoji from "~icons/mdi/emoticon-sad-outline";
import { usePopupState } from "./helpers/state";
import { createErrorReportForExtensionGroups } from "./helpers/utils";

function DashboardStateGroup(props: {
	state: ExtensionState;
	group: keyof Omit<ExtensionStateGroups, symbol>;
}) {
	const group = props.state.groups[props.group];
	const title = useMemo(() => {
		switch (props.group) {
			case "webpack":
				return (
					<SimpleTooltip
						content="The Webpack component is responsible for finding the React instance, as well as syncing history state and themes.
Without it, favedeck can't render any content."
					>
						Webpack
					</SimpleTooltip>
				);
			case "redux":
				return (
					<SimpleTooltip
						content="The Redux component is responsible for adding tweet entities & talking to the Twitter API (unbookmarking/fetching timelines).
Without it, decks can't be viewed, and the &quot;Sort Bookmarks&quot; modal cannot be used."
					>
						Redux
					</SimpleTooltip>
				);
			case "tweetComponent":
				return (
					<SimpleTooltip
						content="The React component that renders tweets. Requires the Fiber Observer to be found.
Without it, decks can't be viewed, and the &quot;Sort Bookmarks&quot; modal cannot be used."
					>
						Tweet Component
					</SimpleTooltip>
				);
			case "messageListener":
				return (
					<SimpleTooltip
						content="The Message Listener syncs the popup with the scripts running inside the webpage.
It also updates the icon of the extension to match your themes's primary color."
					>
						Message Listener
					</SimpleTooltip>
				);
			case "fiberObserver":
				return (
					<SimpleTooltip
						content="The Fiber Observer analyzes the React components being rendered on the page.
The Tweet and Redux components depend on this observer."
					>
						Fiber Observer
					</SimpleTooltip>
				);
			case "tweetObserver":
				return (
					<SimpleTooltip
						content="The Tweet Observer looks for changes in the DOM and highlights tweets which were already decked.
Not crucial for the extension to work, but may degrade UX."
					>
						Tweet Observer
					</SimpleTooltip>
				);
			case "urlObserver":
				return (
					<SimpleTooltip
						content="The URL Observer is responsible for showing favedeck's pages based on the URL. Depends on the Webpack component.
Without it, you can still deck tweets, but you won't be able to view them."
					>
						URL Observer
					</SimpleTooltip>
				);
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
	}, [group.status]);

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
	const [copiedDebugInformation, setCopiedDebugInformation] = useState(false);
	const [copiedErrorReport, setCopiedErrorReport] = useState(false);

	return (
		<div className="w-md bg-fd-bg flex flex-col">
			<div className="p-4 flex flex-col gap-4">
				<details open className="text-fd-fg">
					<summary className="font-medium text-xl">State</summary>

					{!props.state.fine && (
						<p className="mt-2 font-semibold text-center bg-fd-danger/25 p-2 rounded-md">
							The extension is not guaranteed to work properly!
							<br />
							<span
								onClick={() => {
									try {
										navigator.clipboard.writeText(
											createErrorReportForExtensionGroups(),
										);
										setCopiedErrorReport(true);
										setTimeout(() => setCopiedErrorReport(false), 1000);
									} catch (_ex) {}
								}}
								className="underline cursor-pointer"
							>
								{copiedErrorReport ? "Copied!" : "Copy error report"}
							</span>{" "}
							or{" "}
							<span
								onClick={() => {
									try {
										browser.tabs.create({
											url: `https://github.com/nedoxff/favedeck/issues/new?template=bug.yml&error=${encodeURIComponent(createErrorReportForExtensionGroups())}`,
										});
									} catch (_ex) {}
								}}
								className="underline cursor-pointer"
							>
								create a bug report
							</span>
						</p>
					)}
					<div className="flex flex-col mt-2 gap-1">
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
							{props.debugInfo.reactVersion ? (
								<p>
									Twitter is being rendered with React{" "}
									<span className="font-mono bg-fd-primary/50 rounded-md p-1">
										v{props.debugInfo.reactVersion}
									</span>
								</p>
							) : (
								<p>Cannot detect React version (Webpack probably failed)</p>
							)}

							<button
								onClick={async () => {
									if (!props.debugInfo) return;
									await navigator.clipboard.writeText(
										createDebugInfoReport(props.state, props.debugInfo),
									);
									setCopiedDebugInformation(true);
									setTimeout(() => setCopiedDebugInformation(false), 1000);
								}}
								type="button"
								disabled={copiedDebugInformation}
								className={
									"rounded-full cursor-pointer font-bold py-2 px-6 text-center text-white bg-fd-primary disabled:bg-fd-primary/90 hover:bg-fd-primary/90"
								}
							>
								{copiedDebugInformation ? "Copied!" : "Copy debug information"}
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
									url: "https://x.com/i/bookmarks#fd-settings",
								});
								window.close();
							}}
							className="underline cursor-pointer"
						>
							settings
						</button>
						<Circle width={4} height={4} />
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
				"rounded-full cursor-pointer font-bold py-2 px-6 text-center",
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
				<OpenTwitterButton className="mt-2" hasTheme />
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
