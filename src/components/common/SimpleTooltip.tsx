import type { ReactNode } from "react";

export default function SimpleTooltip(props: {
	children?: ReactNode;
	content?: string;
}) {
	return (
		<span
			className="underline decoration-dotted cursor-help"
			title={props.content}
		>
			{props.children}
		</span>
	);
}
