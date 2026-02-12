import { cn } from "@/src/helpers/cn";
import { TwitterModal } from "./TwitterModal";

export default function ConfirmModal(props: {
	title: string;
	description: string;
	onConfirmed?: () => void;
	onCancelled?: () => void;
	confirmText?: string;
	cancelText?: string;
	confirmIsDangerous?: boolean;
}) {
	return (
		<TwitterModal onClose={props.onCancelled}>
			<p className="font-bold text-2xl">{props.title}</p>
			<p className="opacity-75">{props.description}</p>
			<button
				type="button"
				onClick={props.onConfirmed}
				className={cn(
					"rounded-full w-full text-white font-bold disabled:shadow-darken! hover:shadow-darken! py-2 px-4 text-center",
					(props.confirmIsDangerous ?? false)
						? "bg-fd-danger!"
						: "bg-fd-primary!",
				)}
			>
				{props.confirmText ?? "Confirm"}
			</button>
			<button
				onClick={props.onCancelled}
				type="button"
				className="rounded-full w-full text-fd-fg font-bold bg-fd-bg-15! hover:shadow-lighten! py-2 px-4 text-center"
			>
				{props.cancelText ?? "Cancel"}
			</button>
		</TwitterModal>
	);
}
