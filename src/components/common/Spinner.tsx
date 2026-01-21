import { cn } from "@/src/helpers/cn";

export default function Spinner(props: {
	className?: string;
	size?: "normal" | "large";
}) {
	return (
		<span
			className={cn(
				"border-fd-primary/25! border-b-fd-primary! box-border inline-block rounded-full animate-spin",
				(props.size ?? "normal") === "normal"
					? "border-4! w-8 h-8"
					: "border-[6px]! w-12 h-12",
				props.className,
			)}
		/>
	);
}
