import { mergician } from "mergician";
import React from "react";
import { cn } from "@/src/helpers/cn";
import { tweetComponents } from "./Tweet";

export type PatchTweetOptions = {
	displayType?: "Tweet" | "CondensedTweet";
	shouldDisplayBorder?: boolean;
	isClickable?: boolean;
};
const patchTweetProps = (
	tweet: string,
	props: Record<string, unknown>,
	options?: PatchTweetOptions,
) => {
	const copy = mergician({}, props);
	// @ts-expect-error
	// NOTE: THE "-modified" HERE IS REALLY IMPORTANT
	copy.item.id = `tweet-${tweet}-modified`;
	// @ts-expect-error
	copy.item.data.entryId = `tweet-${tweet}`;
	// @ts-expect-error
	copy.item.data.content.id = tweet;
	// @ts-expect-error
	copy.item.render = () => copy.item._renderer(copy.item.data, undefined);
	// @ts-expect-error
	copy.item.data.content.displayType = options?.displayType ?? "Tweet";

	// jesus christ
	if (!(options?.shouldDisplayBorder ?? true)) {
		// @ts-expect-error
		copy.item.data.parentModuleMetadata = {
			verticalMetadata: {
				suppressDividers: true,
			},
		};
		// @ts-expect-error
		copy.item.data.conversationTreeMetadata = {
			descendantConnector: false,
			depth: 0,
		};
	}

	// @ts-expect-error
	copy.item.data.isClickable = options?.isClickable ?? true;
	// @ts-expect-error
	copy.item.data.conversationPosition = undefined;
	// @ts-expect-error
	copy.visible = true;
	// @ts-expect-error
	copy.shouldAnimate = false;
	return copy;
};

export const TweetWrapper = React.memo(
	React.forwardRef<
		HTMLDivElement,
		React.ComponentPropsWithoutRef<"div"> & {
			id: string;
			patchOptions?: PatchTweetOptions;
			className?: string;
		}
	>(function TweetWrapper(props, ref) {
		const { id, patchOptions, className, ...rest } = props;
		return (
			<div
				ref={ref}
				className={cn("*:static! *:transform-none fd-tweet-wrapper", className)}
				{...rest}
			>
				<tweetComponents.Tweet
					{...patchTweetProps(
						id,
						tweetComponents.meta.defaultTweetProps,
						patchOptions,
					)}
				/>
			</div>
		);
	}),
);
