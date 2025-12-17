import { useState } from "react";

function App() {
	const [count, setCount] = useState(0);

	useEffect(() => {
		browser.tabs
			.query({ active: true, currentWindow: true })
			.then((t) => setCount(t.at(0)?.id ?? -1));
	}, []);

	return (
		<>
			<h1>WXT + React</h1>
			<div className="card">
				<button onClick={() => setCount((count) => count + 1)}>
					count is {count}
				</button>
				<p>
					Edit <code>src/App.tsx</code> and save to test HMR
				</p>
			</div>
			<p className="read-the-docs">
				Click on the WXT and React logos to learn more
			</p>
		</>
	);
}

export default App;
