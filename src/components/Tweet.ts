/** biome-ignore-all lint/style/noNonNullAssertion: TODO */

import type { Fiber } from "bippy";
import * as bippy from "bippy";
import type { ComponentType, FunctionComponent, ReactNode } from "react";
import { webpack } from "../helpers/webpack";

export const tweetComponents: {
	Tweet: ComponentType;
	ContextBridge: FunctionComponent<{ children?: ReactNode }>;
	meta: {
		defaultTweetProps: Record<string, unknown>;
		available: boolean;
	};
} = {
	Tweet: null!,
	ContextBridge: null!,
	meta: {
		available: false,
		defaultTweetProps: null!,
	},
};

export const getTweetComponentsFromFiber = (fiber: Fiber) => {
	const TwitterReact = webpack.common.react.React;

	const contexts = bippy
		.getFiberStack(fiber)
		.filter(
			(f) =>
				typeof f.type === "object" &&
				f.type !== null &&
				"value" in f.memoizedProps &&
				f.type._context,
		)
		.map((f) => ({
			context: f.type._context,
			value: f.memoizedProps.value,
		}));

	const type = bippy.getType(fiber);
	if (!type)
		throw new Error(
			"failed to get the Tweet component from fiber (bippy.getType returned null)",
		);

	tweetComponents.Tweet = type;
	tweetComponents.ContextBridge = (props: { children?: ReactNode }) =>
		contexts.reduceRight<React.ReactNode>((acc, cur) => {
			return TwitterReact.createElement(
				cur.context.Provider,
				{ value: cur.value },
				acc,
			);
		}, props.children);

	tweetComponents.meta.defaultTweetProps = fiber.memoizedProps;
	tweetComponents.meta.available = true;
	console.log(tweetComponents);
};

/* try {
								

								const App = () => ContextBridge;

								consale.log("rendering");
								ReactDOM.createRoot(
									document.querySelector("#testtweet"),
								).render(React.createElement(App));
								consale.log("success");

								 consale.log(ContextBridge);
							const portal = react.createPortal(
								React.createElement("input"),
								document.querySelector("#testtweet"),
							);
							console.log(portal);
								/* console.log(
								"eb",
								React.createElement(ErrorBoundary, {}, ContextBridge),
							);
							flushSync(() => {
								react
									.createRoot(document.querySelector("#testtweet"))
									.render(<ContextBridge></ContextBridge>);
							});

							consale.log("render success?");
								//consale.log(type, "success??");
							} catch (err) {
								consale.error(err);
							} */
