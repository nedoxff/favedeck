import type { DragDropEvents } from "@dnd-kit/react";
import { create } from "zustand";
import type { FavedeckSettings } from "@/src/features/storage/settings";

export interface SortTweetsState {
	allTweets: string[];
	sortedTweets: string[];
	selectedInterface:
		| FavedeckSettings["preferredSortBookmarksInterface"]
		| undefined;
	addedIntentionallyUngroupedTweets: boolean;
	isFetchingTweets: boolean;
	isDone: boolean;

	reset: () => void;
	refetchTweetEntries: (force?: boolean) => Promise<void>;
	setRefetchTweetEntries: (
		callback: SortTweetsState["refetchTweetEntries"],
	) => void;

	setSelectedInterface: (
		newInterface: FavedeckSettings["preferredSortBookmarksInterface"],
	) => void;
	setIsDone: (done: boolean) => void;
	setAllTweets: (updater: (current: string[]) => string[]) => void;
	setSortedTweets: (updater: (current: string[]) => string[]) => void;
	setAddedIntentionallyUngroupedTweets: (added: boolean) => void;
	setIsFetchingTweets: (isFetching: boolean) => void;
}

export interface SortTweetsActions {
	onDragOver: DragDropEvents["dragover"];
	onDragEnd: DragDropEvents["dragend"];
	addTweetToNewDeck: (tweet?: PendingNewDeckTweet) => void;
	appendIntentionallyUngroupedTweets: () => Promise<void>;
}

export const useSortTweetsState = create<SortTweetsState>((set) => ({
	addedIntentionallyUngroupedTweets: false,
	isFetchingTweets: false,
	isDone: false,
	allTweets: [],
	sortedTweets: [],
	selectedInterface: undefined,

	reset: () =>
		set({
			allTweets: [],
			sortedTweets: [],
			selectedInterface: undefined,
			isFetchingTweets: false,
			isDone: false,
			addedIntentionallyUngroupedTweets: false,
			refetchTweetEntries: async () => {},
		}),
	refetchTweetEntries: async () => {},
	setRefetchTweetEntries: (callback) => set({ refetchTweetEntries: callback }),

	setSelectedInterface: (newInterface) =>
		set({ selectedInterface: newInterface }),
	setIsDone: (done) => set({ isDone: done }),
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
