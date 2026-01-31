// unfortunately the React import in common/Spinner.tsx is hijacked so that it could be used

import { cn } from "@/src/helpers/cn";

// in the twitter website itself so some code will have to be duplicated
export default function Spinner(props: { size?: "small" | "normal" }) {
	return (
		<span
			className={cn(
				"border-fd-primary/25 border-b-fd-primary box-border inline-block rounded-full animate-spin aspect-square",
				(props.size ?? "normal") === "normal"
					? "border-4 w-8 h-8"
					: "border-2 w-4 h-4",
			)}
		/>
	);
}
