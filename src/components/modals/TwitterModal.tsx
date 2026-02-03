/** biome-ignore-all lint/a11y/useFocusableInteractive: TODO */
/** biome-ignore-all lint/a11y/useSemanticElements: TODO */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: TODO */

import type { ReactNode } from "react";
import { cn } from "@/src/helpers/cn";

export function TwitterModal(props: {
	className?: string;
	onClose?: () => void;
	children?: ReactNode;
	zIndex?: number;
}) {
	const contentRef = useRef<HTMLDivElement>(null);
	return (
		<div className="favedeck-root">
			<div
				role="button"
				className="fixed top-0 bg-fd-mask left-0 w-screen h-screen pointer-events-auto flex flex-col justify-center items-center"
				style={{
					zIndex: props.zIndex ? props.zIndex.toString() : "0",
				}}
				onClick={(ev) => {
					ev.stopPropagation();
					if (
						ev.target instanceof Node &&
						!contentRef.current?.contains(ev.target)
					)
						props.onClose?.();
				}}
			>
				<div
					className={cn(
						"p-8 flex flex-col gap-2 rounded-xl bg-fd-bg cursor-auto",
						props.className,
					)}
					ref={contentRef}
				>
					{props.children}
				</div>
			</div>
		</div>
	);
}
