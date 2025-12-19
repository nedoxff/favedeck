import { webpack } from "../webpack";

const get = () => {
	if (!webpack.common?.react?.ReactDOM) {
		throw new Error("react dom not found");
	}
	return webpack.common.react.ReactDOM;
};

const ReactDOMProxy = new Proxy(
	{},
	{
		get: (_, prop) => {
			const instance = get();
			// @ts-expect-error
			const value = instance[prop];
			return typeof value === "function" ? value.bind(instance) : value;
		},
	},
);

export default ReactDOMProxy;
export const { createPortal, flushSync, createRoot, hydrateRoot } =
	ReactDOMProxy as typeof import("react-dom") &
		typeof import("react-dom/client");
