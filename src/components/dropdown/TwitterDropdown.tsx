import type {
	ForwardRefExoticComponent,
	MouseEvent,
	ReactNode,
	RefAttributes,
} from "react";
import { createPortal } from "react-dom";

export function TwitterDropdownItem(props: {
	icon?: ReactNode;
	text: string;
	description?: string;
	onClick?: (ev: MouseEvent) => void;
}) {
	return (
		<div
			role="button"
			onClick={(ev) => {
				ev.stopPropagation();
				props.onClick?.(ev);
			}}
			className="pointer-events-auto py-3 px-4 flex flex-row gap-3 w-full items-center hover:shadow-lighten!"
		>
			{props.icon}
			<div className="flex flex-col gap-1 grow min-w-0">
				<p className="overflow-auto w-full text-ellipsis">{props.text}</p>
				{props.description && (
					<p className="overflow-auto w-full text-ellipsis">
						{props.description}
					</p>
				)}
			</div>
		</div>
	);
}

export function TwitterDropdown<T extends HTMLElement>(props: {
	trigger: ForwardRefExoticComponent<
		RefAttributes<T> & { isOpen: boolean; setOpen: (open: boolean) => void }
	>;
	children?: (props: {
		open: boolean;
		setOpen: (open: boolean) => void;
	}) => ReactNode;
	zIndex?: number;
}) {
	const [open, setOpen] = useState(false);
	const triggerRef = useRef<T>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	const lastKnownTriggerRect = useRef<DOMRect>(null);
	const layoutCallback = useCallback(() => {
		if (triggerRef.current?.isConnected && triggerRef.current.checkVisibility())
			lastKnownTriggerRect.current = triggerRef.current.getBoundingClientRect();
		if (!containerRef.current || !lastKnownTriggerRect.current) return;
		const containerRect = containerRef.current.getBoundingClientRect();

		let top =
			lastKnownTriggerRect.current.top +
			lastKnownTriggerRect.current.height +
			window.scrollY +
			10;
		// position it above the button if it doesn't fit below
		if (top - window.scrollY + containerRect.height > window.innerHeight) {
			top =
				lastKnownTriggerRect.current.top -
				lastKnownTriggerRect.current.height -
				containerRect.height +
				window.scrollY +
				10;
		}
		const left =
			lastKnownTriggerRect.current.left +
			lastKnownTriggerRect.current.width -
			containerRect.width;

		containerRef.current.style.top = `${top}px`;
		containerRef.current.style.left = `${left}px`;
	}, [triggerRef, containerRef]);

	const clickCallback = useCallback(
		(ev: PointerEvent) => {
			if (!containerRef.current || !ev.target || !(ev.target instanceof Node))
				return;
			if (!containerRef.current.contains(ev.target)) setOpen(false);
		},
		[containerRef],
	);

	useEffect(() => {
		if (open) {
			if (!containerRef.current) return;
			document.addEventListener("resize", layoutCallback);
			document.addEventListener("scroll", layoutCallback);
			document.addEventListener("click", clickCallback);
			queueMicrotask(() => {
				if (containerRef.current) containerRef.current.style.opacity = "1";
				layoutCallback();
			});
		}

		return () => {
			document.removeEventListener("resize", layoutCallback);
			document.removeEventListener("scroll", layoutCallback);
			document.removeEventListener("click", clickCallback);
		};
	}, [open, containerRef]);

	return (
		<>
			<props.trigger ref={triggerRef} isOpen={open} setOpen={setOpen} />
			{open &&
				createPortal(
					<div className="favedeck-root">
						<div
							className="bg-fd-bg max-w-sm rounded-xl flex flex-col absolute opacity-0 top-0 left-0 overflow-hidden shadow-twitter!"
							style={{
								zIndex: props.zIndex ? props.zIndex.toString() : "0",
							}}
							ref={containerRef}
						>
							{props.children?.({ open, setOpen })}
						</div>
					</div>,
					document.body,
				)}
		</>
	);
}
