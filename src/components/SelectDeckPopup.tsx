/** biome-ignore-all lint/style/noNonNullAssertion: <explanation> */
import { createRoot } from "react-dom/client";

function DeckCard(props: { id?: string }) {
	const iconRef = useRef<HTMLImageElement>(null!);

	useEffect(() => {
		fetch("https://dummyimage.com/200").then(async (r) => {
			const blob = await r.blob();
			const url = URL.createObjectURL(blob);
			iconRef.current.src = url;
		});
	}, []);

	return (
		<div className="bg-red-400 w-sm flex flex-row justify-between items-center gap-4">
			<div className="flex flex-row h-full gap-4 justify-center items-center">
				<img ref={iconRef} />
				meow
			</div>

			<button>save</button>
		</div>
	);
}

export function SelectDeckPopup() {
	const bg = getComputedStyle(document.body).backgroundColor;
	return (
		<div
			className="p-4 rounded-xl"
			style={{
				backgroundColor: bg,
				boxShadow:
					"rgba(255, 255, 255, 0.2) 0px 0px 15px, rgba(255, 255, 255, 0.15) 0px 0px 3px 1px",
			}}
		>
			<DeckCard />
		</div>
	);
}

export const SelectDeckPopupRenderer = (() => {
	let bookmarkButton: HTMLButtonElement | undefined;
	let container: HTMLDivElement | undefined;

	const hide = () => {
		document.removeEventListener("resize", layoutCallback);
		document.removeEventListener("scroll", layoutCallback);
		document.removeEventListener("click", clickCallback);
		if (!container) return;
		container.style.left = "0";
		container.style.top = "0";
		bookmarkButton = undefined;
	};

	const layoutCallback = () => {
		if (!bookmarkButton || !container) return;
		const rect = bookmarkButton.getBoundingClientRect();
		const popupRect = container.getBoundingClientRect();
		const top = rect.top + rect.height + window.scrollY + 15;
		const left =
			rect.left + window.scrollX - popupRect.width / 2 + rect.width / 2;

		container.style.top = `${top}px`;
		container.style.left = `${left}px`;
	};

	const clickCallback = (ev: PointerEvent) => {
		if (
			!bookmarkButton ||
			!container ||
			!ev.target ||
			!(ev.target instanceof Node)
		)
			return;
		if (!container.contains(ev.target)) hide();
	};

	return {
		create() {
			if (container !== undefined) {
				hide();
				container.remove();
			}

			const div = document.createElement("div");
			div.style.zIndex = "1000";
			div.style.position = "absolute";
			div.style.left = "0";
			div.style.top = "0";
			div.id = "favedeck-select-deck";
			document.body.append(div);
			container = div;

			createRoot(div).render(<SelectDeckPopup />);
		},
		show(bb) {
			bookmarkButton = bb;
			if (!container || !bookmarkButton) return;
			document.addEventListener("resize", layoutCallback);
			document.addEventListener("scroll", layoutCallback);
			document.addEventListener("click", clickCallback);
			layoutCallback();
		},
		hide,
	} satisfies {
		create: () => void;
		show: (bookmarkButton: HTMLButtonElement) => void;
		hide: () => void;
	};
})();
