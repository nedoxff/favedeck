export type GlobalMetadata = {
	cookies: {
		categories: Record<number, string[]>;
		fetchedTime: number;
		version: string;
	};
	env: string;
	hasMultiAccountCookie: boolean;
	isCanary: boolean;
	isLoggedIn: boolean;
	isTwoffice: boolean;
	serverDate: number;
	sha: string;
	tags: Record<string, string | number | boolean>;
	uaParserTags: string[];
	userHash: string;
	userId: string;
};

declare global {
	interface Window {
		__META_DATA__?: GlobalMetadata;
	}
}
