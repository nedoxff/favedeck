export type CursorTimelineEntry = {
	type: "timelineCursor";
	sortIndex: string;
	entryId: string;
	itemMetadata: Record<string, unknown>;
	content: {
		cursorType: string;
		value: string;
		stopOnEmptyResponse?: boolean;
	};
};

// too lazy to reverse engineer *everything*
// so only the basic stuff is here
export type TweetTimelineEntry = {
	type: "tweet";
	sortIndex: string;
	entryId: string;
	content: {
		id: string;
		displayType: string;
	};

	conversationPosition?: string;
	isClickable?: boolean;
	parentModuleMetadata?: {
		verticalMetadata?: {
			suppressDividers?: boolean;
		};
	};
	conversationTreeMetadata?: {
		descendantConnector?: boolean;
		depth?: number;
	};
};

export type TweetEntry = {
	visible: boolean;
	shouldAnimate: boolean;
	item: {
		id: string;
		render: () => unknown;
		data: TweetTimelineEntry;
	};
};

export type TimelineEntry = CursorTimelineEntry | TweetTimelineEntry;
