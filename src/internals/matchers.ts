export const matchers = {
	tweet: {
		querySelector: "article[data-testid=tweet]",
		matcher: (el: HTMLElement) => el.dataset.testid === "tweet",
	},
	tweetRoot: {
		querySelector: "div[data-testid=cellInnerDiv]",
		matcher: (el: HTMLElement) => el.dataset.testid === "cellInnerDiv",
	},
	bookmarkButton: {
		querySelector:
			"button[data-testid=bookmark], button[data-testid=removeBookmark]",
		matcher: (el: HTMLElement) =>
			el.dataset.testid === "bookmark" ||
			el.dataset.testid === "removeBookmark",
	},
	likeButton: {
		querySelector: "button[data-testid=like], button[data-testid=unlike]",
		matcher: (el: HTMLElement) =>
			el.dataset.testid === "like" || el.dataset.testid === "unlike",
	},
	primaryColumn: {
		querySelector: "div[data-testid=primaryColumn]",
		matcher: (el: HTMLElement) => el.dataset.testid === "primaryColumn",
	},
	videoComponent: {
		querySelector: "div[data-testid=videoComponent]",
		matcher: (el: HTMLElement) => el.dataset.testid === "videoComponent",
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
