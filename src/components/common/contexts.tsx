import { createContext } from "react";

export const DeckCategoryContext = createContext<"bookmarks" | "likes">("bookmarks");