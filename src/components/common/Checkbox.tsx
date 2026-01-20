import { cn } from "@/src/helpers/cn";
import CheckIcon from "~icons/mdi/check";

export default function Checkbox(props: {
	checked?: boolean;
	onChecked?: (checked: boolean) => void;
	className?: string;
}) {
	return (
		<label className="flex items-center relative">
			<input
				type="checkbox"
				className="appearance-none absolute opacity-0 w-full h-full cursor-pointer"
				checked={props.checked ?? false}
				onChange={() => props.onChecked?.(!props.checked)}
			/>
			<span className="absolute w-[175%] h-[175%] left-1/2 -translate-x-1/2! rounded-full hover:shadow-lighten!" />
			<span
				className={cn(
					"flex justify-center items-center w-6 h-6 rounded-md",
					props.checked === true ? "bg-fd-primary border-0" : "border-2",
				)}
			>
				{props.checked === true && <CheckIcon className="text-white" />}
			</span>
		</label>
	);
}
