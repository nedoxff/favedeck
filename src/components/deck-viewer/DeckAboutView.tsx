import FoldersLogo from "@/public/img/icons/folders-colored.svg?react";
import MartenLogo from "@/public/img/icons/marten-colored.svg?react";
import Cat from "~icons/mdi/cat";
import Circle from "~icons/mdi/circle";
import SimpleTooltip from "../common/SimpleTooltip";

const splashes = [
	<p className="text-2xl" key="slop">
		<SimpleTooltip content="Without use of generative AI">
			Organically sourced
		</SimpleTooltip>{" "}
		slop
	</p>,
	<p className="text-2xl" key="typescript">
		Now with 200% more TypeScript!
	</p>,
	<p className="text-2xl" key="lorem-ipsum">
		<SimpleTooltip content="This isn't actually a placeholder text.">
			Lorem ipsum dolor sit amet
		</SimpleTooltip>
	</p>,
	<Cat key="cat" width={48} height={48} />,
	<p className="text-2xl" key="max-decks">
		9007199254740991 decks might be enough...
	</p>,
];

export default function DeckAboutView() {
	const [currentIcon, setCurrentIcon] = useState<"marten" | "folders">(
		"marten",
	);
	const [splashIndex] = useState(Math.floor(Math.random() * splashes.length));
	return (
		<div className="flex flex-col gap-8 justify-center items-center h-[calc(100vh-3.5rem)]">
			<div className="flex flex-col w-full items-center justify-center">
				<div
					role="button"
					onClick={() =>
						setCurrentIcon(currentIcon === "marten" ? "folders" : "marten")
					}
					className="transition-all active:scale-90! w-2/5 aspect-square p-4 bg-fd-primary/30 rounded-2xl flex items-end justify-center"
				>
					{currentIcon === "marten" ? (
						<MartenLogo className="-mb-4 text-fd-primary pointer-events-none" />
					) : (
						<FoldersLogo className="text-fd-primary pointer-events-none" />
					)}
				</div>
				<p className="text-3xl font-semibold mt-2">favedeck</p>
				<p className="text-lg flex flex-row items-center gap-1">
					<a
						target="_blank"
						rel="noopener"
						className="underline"
						href="https://github.com/nedoxff/favedeck"
					>
						Source code
					</a>
					<Circle width={4} height={4} />
					<a
						target="_blank"
						rel="noopener"
						className="underline"
						href="https://github.com/nedoxff/favedeck/blob/main/docs/faq.md"
					>
						FAQ
					</a>
				</p>
				<p className="opacity-50 flex flex-row items-center gap-1">
					{import.meta.env.VITE_APP_VERSION} <Circle width={4} height={4} />
					<a
						target="_blank"
						rel="noopener"
						href={`https://github.com/nedoxff/favedeck/commit/${import.meta.env.VITE_APP_HASH}`}
						className="underline"
					>
						{import.meta.env.VITE_APP_HASH}
					</a>
				</p>
			</div>

			<div className="flex flex-col w-full items-center justify-center">
				{splashes[splashIndex]}
				<p className="opacity-50">&copy; {new Date().getFullYear()} nedoxff</p>
			</div>
		</div>
	);
}
