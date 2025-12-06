declare global {
	interface Window {
		__FAVEDECK_OVERRIDES: {
			onBookmark: () => void;
		};
	}
}
export { };

