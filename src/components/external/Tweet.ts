/** biome-ignore-all lint/style/noNonNullAssertion: TODO */

import { Result } from "better-result";
import type { Fiber } from "bippy";
import * as bippy from "bippy";
import type { ComponentType, FunctionComponent, ReactNode } from "react";
import { tweetsEventTarget } from "@/src/features/events/tweets";
import { webpack } from "@/src/internals/webpack";

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
		defaultTweetProps: null!,
		available: false,
	},
};

export const getTweetComponentsFromFiber = (fiber: Fiber) =>
	Result.try(() => {
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

		tweetComponents.meta.defaultTweetProps = fiber.memoizedProps;
		tweetsEventTarget.dispatchComponentsAvailable();
	});
