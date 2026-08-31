import type { Key, ReactNode } from "react";
import { cn } from "@/src/helpers/cn";

export default function Tabs<T extends Key>(props: {
	state: T;
	onUpdate: (newState: T) => void;
	tabs: { key: T; text: string; icon: ReactNode }[];
	classNames?: { container?: string; tab?: string };
}) {
	return (
		<div
			className={cn(
				"w-full flex flex-row *:flex-1 min-h-14 max-h-14",
				props.classNames?.container,
			)}
			style={{ flexBasis: `${Math.round(100 / props.tabs.length)}%` }}
		>
			{props.tabs.map((t) => (
				<div
					key={t.key}
					onClick={() => props.onUpdate(t.key)}
					className={cn(
						"flex justify-center items-center hover:shadow-lighten! transition-shadow duration-300 cursor-pointer",
						props.classNames?.tab,
					)}
				>
					<div className="flex flex-col justify-center items-center relative h-full">
						<div
							className={cn(
								"flex flex-row justify-center items-center",
								props.state !== t.key && "opacity-50",
							)}
						>
							{t.icon}
							<p className="ml-2">{t.text}</p>
						</div>
						{props.state === t.key && (
							<div className="absolute bottom-0 p-0.5 rounded-full bg-fd-primary w-full" />
						)}
					</div>
				</div>
			))}
		</div>
	);
}
