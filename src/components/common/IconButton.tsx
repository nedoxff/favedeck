import { forwardRef } from "react";
import { cn } from "@/src/helpers/cn";

export const IconButton = forwardRef<
	HTMLButtonElement,
	React.ComponentPropsWithoutRef<"button">
>(function IconButton(props, ref) {
	const { className, ...otherProps } = props;
	return (
		<button
			type="button"
			ref={ref}
			className={cn(
				"rounded-full aspect-square flex justify-center items-center p-2 h-fit hover:shadow-lighten!",
				className,
			)}
			{...otherProps}
		>
			{props.children}
		</button>
	);
});
