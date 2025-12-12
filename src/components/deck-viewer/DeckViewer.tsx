// oh boy

import { matchers } from "@/src/helpers/matchers";
import { waitForSelector } from "@/src/helpers/observer";
import { webpack } from "@/src/helpers/webpack";
import { createRoot, type Root } from "react-dom/client";

function DeckBoard() {
	return (
		<div className="flex flex-col">
			<div className="h-14 px-4 gap-6 flex flex-row items-center">
				<a
					href="/home"
					onClick={(ev) => {
						ev.preventDefault();
						const module = webpack.findByProperty("goBack", { maxDepth: 1 });
						// @ts-expect-error
						const history = module?.module.ZP;
						history.push("/home");
					}}
				>
					<div className="rounded-full hover:shadow-lighten! p-2">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="24px"
							height="24px"
							viewBox="0 0 512 512"
						>
							<title>back arrow icon</title>
							<path
								fill="none"
								stroke="currentColor"
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="48"
								d="M244 400L100 256l144-144M120 256h292"
							/>
						</svg>
					</div>
				</a>
				<p className="font-bold text-xl">Decks</p>
			</div>
			<hr className="border-t-2" />
		</div>
	);
}

export const DeckViewer = (() => {
	let root: Root;

	return {
		async create() {
			const container = await waitForSelector(
				document.body,
				matchers.primaryColumn.querySelector,
				5000,
			);
			if (!container) {
				console.error("couldn't find primary column");
				return;
			}

			root = createRoot(container);
			window.addEventListener("fd-reset", () => {
				console.log("unmounting DeckViewer");
				root.unmount();
			});

			console.log("mounting new DeckViewer");
			root.render(<DeckBoard />);
		},
		hide() {
			console.log("unmounting DeckViewer");
			root.unmount();
		},
	} satisfies {
		create: () => void;
		hide: () => void;
	};
})();
