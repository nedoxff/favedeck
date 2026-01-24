export default function DeckAboutView() {
	return (
		<>
			{import.meta.env.VITE_APP_HASH} | {import.meta.env.VITE_APP_VERSION}
		</>
	);
}
