import { useState } from "react";
import { messenger } from "@/src/helpers/messaging-extension";
import type { ExtensionState } from "@/src/helpers/state";

function App() {
	const [state, setState] = useState<ExtensionState | undefined>(undefined);

	const initialized = useRef(false);
	useEffect(() => {
		if (initialized.current) return;
		messenger.onMessage("setState", (message) => setState(message.data));
		browser.tabs.query({ active: true, currentWindow: true }).then((tab) =>
			messenger.sendMessage("requestState", undefined, {
				tabId: tab[0].id ?? 0,
			}),
		);
		initialized.current = true;
	}, []);

	return <>{state && <p>{JSON.stringify(state)}</p>}</>;
}

export default App;
