import { webpack } from "../webpack";

const get = () => {
	if (!webpack.common?.react?.React) throw new Error("react not found");
	return webpack.common.react.React;
};

const ReactProxy = new Proxy(
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

export default ReactProxy;
export const {
	useState,
	useEffect,
	useContext,
	useReducer,
	useCallback,
	useMemo,
	useRef,
	useLayoutEffect,
	useImperativeHandle,
	useSyncExternalStore,
	useDeferredValue,
	createContext,
	createElement,
	cloneElement,
	isValidElement,
	forwardRef,
	memo,
	Fragment,
	Children,
	Suspense,
	lazy,
	startTransition,
	useInsertionEffect,
} = ReactProxy as typeof import("react");
