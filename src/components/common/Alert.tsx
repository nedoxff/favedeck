import type { ReactNode } from "react";
import { cn } from "@/src/helpers/cn";
import WarningIcon from "~icons/mdi/alert-outline";
import ErrorIcon from "~icons/mdi/close-circle-outline";
import InformationIcon from "~icons/mdi/information-outline";

export default function Alert(props: {
	type: "info" | "warning" | "error";
	title?: ReactNode;
	description?: ReactNode;
	showIcon?: boolean;
	className?: string;
}) {
	const Icon = (() => {
		switch (props.type) {
			case "info":
				return InformationIcon;
			case "warning":
				return WarningIcon;
			case "error":
				return ErrorIcon;
		}
	})();

	return (
		<div
			className={cn(
				"p-2 flex flex-row justify-center items-center rounded-xl text-white",
				props.type === "error" ? "bg-fd-danger!" : "bg-fd-primary!",
				props.className,
			)}
		>
			{(props.showIcon ?? true) === true && (
				<div className="h-full flex pr-2">
					<Icon width={36} height={36} />
				</div>
			)}
			<div className="grow">
				{props.title}
				{props.description}
			</div>
		</div>
	);
}
