import { webpack } from "../webpack";

const get = () => {
	if (!webpack.common?.react?.JSXRuntime) {
		throw new Error("react/jsx-runtime not found");
	}
	return webpack.common.react.JSXRuntime;
};

const JSXRuntimeProxy = new Proxy(
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

export default JSXRuntimeProxy;
export const { Fragment, jsx, jsxs } =
	JSXRuntimeProxy as typeof import("react/jsx-runtime");
