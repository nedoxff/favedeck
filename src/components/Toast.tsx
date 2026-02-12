import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { v6 } from "uuid";
import { create } from "zustand/react";
import CloseIcon from "~icons/mdi/close";
import { createDebugInfoReport, createErrorReport } from "../helpers/reports";
import { getRawExtensionState } from "../helpers/state";
import { getDebugInfo } from "../internals/foolproof";
import Alert from "./common/Alert";
import { IconButton } from "./common/IconButton";
import { components } from "./wrapper";

function ToastContainer() {
	const { toasts, removeToast } = useToastsState();
	return (
		<div className="flex flex-col gap-2 max-w-lg">
			{toasts.map((toast) => (
				<Alert
					type={toast.type ?? "info"}
					title={toast.title}
					description={toast.description}
					endContent={
						toast.showCloseButton ? (
							<IconButton onClick={() => removeToast(toast.id)}>
								<CloseIcon width={18} height={18} />
							</IconButton>
						) : undefined
					}
					showIcon
					key={toast.id}
				/>
			))}
		</div>
	);
}

export const DEFAULT_TOAST_TIMEOUT_MS = 5000;

export type Toast = {
	id: string;
	type?: "error" | "warning" | "info" | "success";
	showCloseButton?: boolean;
	title?: ReactNode;
	description?: ReactNode;
};
export interface ToastState {
	toasts: Toast[];
	addToast: (toast: Toast) => void;
	removeToast: (id: string) => void;
}

export const useToastsState = create<ToastState>((set) => ({
	toasts: [],
	addToast: (toast) => set((cur) => ({ toasts: [...cur.toasts, toast] })),
	removeToast: (id) =>
		set((cur) => ({ toasts: cur.toasts.filter((t) => t.id !== id) })),
}));

export const Toast = (() => {
	let root: Root | undefined;
	let container: HTMLDivElement | undefined;

	const init = () => {
		container = document.createElement("div");
		container.classList.add("favedeck-root");
		container.style.position = "absolute";
		container.style.left = "50%";
		container.style.bottom = "2rem";
		container.style.zIndex = "100";
		container.style.transform = "translateX(-50%)";
		document.body.append(container);
		root = createRoot(container);
		root.render(<ToastContainer />);
	};

	useToastsState.subscribe((state) => {
		if (state.toasts.length !== 0) {
			if (!container) init();
			else container.style.display = "flex";
		} else if (container) container.style.display = "none";
	});

	const createToast = (
		type: NonNullable<Toast["type"]>,
		title: string,
		description?: ReactNode,
		ms?: number,
	) => {
		const id = v6();

		useToastsState.getState().addToast({
			id,
			title: <p className="text-lg font-semibold">{title}</p>,
			description: description,
			type: type,
			showCloseButton: true,
		});

		const timeout = ms ?? DEFAULT_TOAST_TIMEOUT_MS;
		if (timeout !== Infinity)
			setTimeout(() => useToastsState.getState().removeToast(id), timeout);
	};

	return {
		error(title, error, ms = undefined) {
			const report = `${createErrorReport(title, error)}\n\n${createDebugInfoReport(
				getRawExtensionState(),
				getDebugInfo(),
			)}`;
			createToast(
				"error",
				title,
				<p>
					<span
						className="underline cursor-pointer"
						onClick={async () => {
							await navigator.clipboard.writeText(report);
							components.Toast.success("Copied error report to the clipboard");
						}}
					>
						Copy error report
					</span>{" "}
					or{" "}
					<a
						href={`https://github.com/nedoxff/favedeck/issues/new?template=bug.yml&error=${encodeURIComponent(report)}`}
						className="underline cursor-pointer"
					>
						create a bug report
					</a>
				</p>,
				ms,
			);
		},
		info(message, ms = undefined) {
			createToast("info", message, undefined, ms);
		},
		success(message, ms = undefined) {
			createToast("success", message, undefined, ms);
		},
		warning(message, ms = undefined) {
			createToast("warning", message, undefined, ms);
		},
	} satisfies {
		error: (title: string, error: Error, ms?: number) => void;
		info: (message: string, ms?: number) => void;
		warning: (message: string, ms?: number) => void;
		success: (message: string, ms?: number) => void;
	};
})();
