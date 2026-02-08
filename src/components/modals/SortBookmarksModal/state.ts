import type { DragDropEvents } from "@dnd-kit/react";
import { create } from "zustand";

export interface SortBookmarksState {
	allTweets: string[];
	sortedTweets: string[];
	addedIntentionallyUngroupedTweets: boolean;
	isFetchingTweets: boolean;

	reset: () => void;
	refetchTweetEntries: (force?: boolean) => Promise<void>;
	setRefetchTweetEntries: (
		callback: SortBookmarksState["refetchTweetEntries"],
	) => void;

	setAllTweets: (updater: (current: string[]) => string[]) => void;
	setSortedTweets: (updater: (current: string[]) => string[]) => void;
	setAddedIntentionallyUngroupedTweets: (added: boolean) => void;
	setIsFetchingTweets: (isFetching: boolean) => void;
}

export interface SortBookmarksActions {
	onDragOver: DragDropEvents["dragover"];
	onDragEnd: DragDropEvents["dragend"];
	addTweetToNewDeck: (tweet?: PendingNewDeckTweet) => void;
	appendIntentionallyUngroupedTweets: () => void;
}

export const useSortBookmarksState = create<SortBookmarksState>((set) => ({
	addedIntentionallyUngroupedTweets: false,
	isFetchingTweets: false,
	allTweets: [],
	sortedTweets: [],

	reset: () =>
		set({
			allTweets: [],
			sortedTweets: [],
			isFetchingTweets: false,
			addedIntentionallyUngroupedTweets: false,
			refetchTweetEntries: async () => {},
		}),
	refetchTweetEntries: async () => {},
	setRefetchTweetEntries: (callback) => set({ refetchTweetEntries: callback }),

	setAddedIntentionallyUngroupedTweets: (added) =>
		set({ addedIntentionallyUngroupedTweets: added }),
	setIsFetchingTweets: (isFetching) => set({ isFetchingTweets: isFetching }),
	setAllTweets: (updater) =>
		set((cur) => ({ allTweets: updater(cur.allTweets) })),
	setSortedTweets: (updater) =>
		set((cur) => ({ sortedTweets: updater(cur.sortedTweets) })),
}));

export type PendingNewDeckTweet = {
	id: string;
	index: number;
};
