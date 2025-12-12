// the functions defined here are supposed to be as foolproof as
// possible to prevent having to update the extension every time the website
// updates as well.

import type { Fiber } from "bippy";

export const getUserId = async (tweetFiber?: Fiber) => {
	// window.__META_DATA__ has a lot of goodies
	if (
		"__META_DATA__" in window &&
		typeof window.__META_DATA__ === "object" &&
		window.__META_DATA__ !== null &&
		"userId" in window.__META_DATA__ &&
		typeof window.__META_DATA__.userId === "string"
	)
		return window.__META_DATA__.userId;

	// the twid cookie is also supposed to be present i guess...
	try {
		const userIdCookie = await browser.cookies.get({
			name: "twid",
			url: "https://x.com",
		});
		if (userIdCookie?.value) return userIdCookie.value;
	} catch (_ex) {}

	// it's also possible to get the user id via the tweet's viewerUser prop
	if (tweetFiber) {
		try {
			//@ts-expect-error
			const userId = tweetFiber.memoizedProps?.viewerUser?.id_str as
				| string
				| undefined;
			if (userId) return userId;
		} catch (_ex) {}
	}

	return undefined;
};
