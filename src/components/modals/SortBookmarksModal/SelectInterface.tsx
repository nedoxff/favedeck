import type { ForwardRefExoticComponent, ReactNode, SVGProps } from "react";
import type { FavedeckSettings } from "@/src/features/storage/settings";
import CardsIcon from "~icons/mdi/cards";
import MasonryIcon from "~icons/mdi/view-dashboard";
import Alert from "../../common/Alert";
import Checkbox from "../../common/Checkbox";

function InterfaceCard(props: {
	icon: ForwardRefExoticComponent<SVGProps<SVGSVGElement>>;
	title: ReactNode;
	description: ReactNode;
	onClick: () => void;
}) {
	return (
		<div
			role="button"
			onClick={props.onClick}
			className="rounded-xl w-2/5 p-8 flex flex-col gap-2 justify-center items-center border-2 cursor-pointer hover:border-fd-primary! transition-all"
		>
			<props.icon width={48} height={48} />
			<p className="text-2xl font-semibold text-center">{props.title}</p>
			<p className="opacity-75 text-center">{props.description}</p>
		</div>
	);
}

export default function SelectSortBookmarksInterface(props: {
	onSelected: (
		selectedInterface: Exclude<
			FavedeckSettings["preferredSortBookmarksInterface"],
			"ask"
		>,
		remember: boolean,
	) => void;
}) {
	const [rememberChoice, setRememberChoice] = useState(false);
	return (
		<div className="w-full h-full flex flex-col gap-4 justify-center items-center">
			<p className="font-bold text-3xl">
				How would you like to sort bookmarks?
			</p>
			<div className="flex flex-row justify-center gap-2">
				<InterfaceCard
					icon={CardsIcon}
					title={"Card Game"}
					description={
						<>Tweets are arranged like a card deck and sorted in groups of 5.</>
					}
					onClick={() => props.onSelected("card-game", rememberChoice)}
				/>
				<InterfaceCard
					icon={MasonryIcon}
					title={"Masonry"}
					description={
						<>
							Tweets are arranged in a masonry grid, similar to Pinterest's.
							<br />
							<span className="font-semibold">
								It is highly recommended to turn the "Fetch more tweets per
								request" option ON for this mode.
							</span>
						</>
					}
					onClick={() => props.onSelected("masonry", rememberChoice)}
				/>
			</div>
			<div className="flex flex-row justify-center items-end gap-2">
				<Checkbox
					checked={rememberChoice}
					onChecked={(ch) => setRememberChoice(ch)}
				/>
				<p>Remember this choice</p>
			</div>
			<Alert
				className="w-1/3"
				type="warning"
				title={<p className="text-lg font-semibold">Reminder</p>}
				description={
					<p>
						<a
							target="_blank"
							rel="noopener"
							className="underline"
							href="https://github.com/nedoxff/favedeck?tab=readme-ov-file#ratelimits"
						>
							This interface is subject to Twitter's ratelimits.
						</a>{" "}
						Please use it sparingly, or you might not be able to browse
						bookmarks at all!
					</p>
				}
			/>
		</div>
	);
}
