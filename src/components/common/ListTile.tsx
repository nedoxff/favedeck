import type { ReactNode } from "react";

export default function ListTile(props: {
	startContent?: ReactNode;
	endContent?: ReactNode;
	title?: ReactNode;
	description?: ReactNode;
}) {
	return (
		<div className="flex flex-row gap-4 items-center py-2 px-6">
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
