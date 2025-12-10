export const matchers = {
	tweet: {
		querySelector: "article[data-testid=tweet]",
		matcher: (el: HTMLElement) => el.getAttribute("data-testid") === "tweet",
	},
	bookmarkButton: {
		querySelector:
			"button[data-testid=bookmark], button[data-testid=removeBookmark]",
		matcher: (el: HTMLElement) =>
			el.getAttribute("data-testid") === "bookmark" ||
			el.getAttribute("data-testid") === "removeBookmark",
	},
};
