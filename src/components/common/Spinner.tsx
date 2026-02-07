import { cn } from "@/src/helpers/cn";

export default function Spinner(props: {
	className?: string;
	size?: "small" | "normal" | "large";
}) {
	return (
		<span
			className={cn(
				"border-fd-primary/25! border-b-fd-primary! box-border inline-block rounded-full animate-spin",
				(props.size ?? "normal") === "normal"
					? "border-4! w-8 h-8"
					: props.size === "small"
						? "border-2 w-4 h-4"
						: "border-[6px]! w-12 h-12",
				props.className,
			)}
		/>
	);
}
