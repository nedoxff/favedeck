export const matchers = {
	tweet: {
		querySelector: "article[data-testid=tweet]",
		matcher: (el: HTMLElement) => el.getAttribute("data-testid") === "tweet",
	},
	tweetRoot: {
		querySelector: "div[data-testid=cellInnerDiv]",
		matcher: (el: HTMLElement) =>
			el.getAttribute("data-testid") === "cellInnerDiv",
	},
	bookmarkButton: {
		querySelector:
			"button[data-testid=bookmark], button[data-testid=removeBookmark]",
		matcher: (el: HTMLElement) =>
			el.getAttribute("data-testid") === "bookmark" ||
			el.getAttribute("data-testid") === "removeBookmark",
	},
	primaryColumn: {
		querySelector: "div[data-testid=primaryColumn]",
		matcher: (el: HTMLElement) =>
			el.getAttribute("data-testid") === "primaryColumn",
	},
};

export const findParentNode = (
	el: HTMLElement,
	matcher: (parent: HTMLElement) => boolean,
): HTMLElement | null => {
	let parent = el.parentElement;
	while (parent && !matcher(parent)) parent = parent.parentElement;
	return parent;
};
