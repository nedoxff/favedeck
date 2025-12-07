import { createRoot } from "react-dom/client";

export function SelectBoardPopup() {
	return "meow";
}

export const SelectBoardPopupRenderer = (() => {
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
			if (document.querySelector("#favedeck-select-board") !== null)
				document.querySelector("#favedeck-select-board")?.remove();

			const div = document.createElement("div");
			div.style.zIndex = "1000";
			div.style.position = "absolute";
			div.style.left = "0";
			div.style.top = "0";
			if (import.meta.env.DEV) div.style.border = "2px solid red";
			document.body.append(div);
			container = div;

			createRoot(div).render(<SelectBoardPopup />);
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
