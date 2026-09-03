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
		const contexts: { context: bippy.ReactContext<unknown>; value: unknown }[] =
			[];
		bippy.traverseFiber(
			fiber,
			(parentFiber) => {
				if (
					parentFiber.type &&
					typeof parentFiber.type === "object" &&
					parentFiber.type.$$typeof === Symbol.for("react.context")
				) {
					contexts.push({
						context: parentFiber.type,
						value: parentFiber.memoizedProps.value,
					});
				}
			},
			true,
		);

		const type = bippy.getType(fiber);
		if (!type)
			throw new Error(
				"failed to get the Tweet component from fiber (bippy.getType returned null)",
			);

		tweetComponents.Tweet = type;
		tweetComponents.ContextBridge = (props: { children?: ReactNode }) =>
			contexts.reduceRight<React.ReactNode>((acc, cur) => {
				return webpack.common.react.React.createElement(
					// @ts-expect-error
					cur.context,
					{ value: cur.value },
					acc,
				);
			}, props.children);

		tweetComponents.meta.defaultTweetProps = fiber.memoizedProps;
		tweetsEventTarget.dispatchComponentsAvailable();
	});
