/** biome-ignore-all lint/style/noNonNullAssertion: TODO */

import { webpack } from "@/src/internals/webpack";
import type { Fiber } from "bippy";
import * as bippy from "bippy";
import type { ComponentType, FunctionComponent, ReactNode } from "react";

export const tweetComponents: {
	Tweet: ComponentType;
	ContextBridge: FunctionComponent<{ children?: ReactNode }>;
	defaultTweetProps: Record<string, unknown>;
} = {
	Tweet: null!,
	ContextBridge: null!,
	defaultTweetProps: null!,
};

export const getTweetComponentsFromFiber = (fiber: Fiber) => {
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
			return webpack.common.react.React.createElement(
				cur.context.Provider,
				{ value: cur.value },
				acc,
			);
		}, props.children);

	tweetComponents.defaultTweetProps = fiber.memoizedProps;
};
