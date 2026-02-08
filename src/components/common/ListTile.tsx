import type { ReactNode } from "react";
import { cn } from "@/src/helpers/cn";

export default function ListTile(props: {
	startContent?: ReactNode;
	endContent?: ReactNode;
	title?: ReactNode;
	description?: ReactNode;
	onClick?: () => void;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex flex-row gap-4 items-center py-4 px-6",
				props.className,
				props.onClick && "hover:shadow-lighten! hover:cursor-pointer",
			)}
			role="button"
			onClick={props.onClick}
		>
			{props.startContent}
			<div className="flex flex-col grow">
				{props.title && <p className="font-bold text-lg">{props.title}</p>}
				{props.description && (
					<p className="opacity-75 leading-none">{props.description}</p>
				)}
			</div>
			{props.endContent}
		</div>
	);
}
