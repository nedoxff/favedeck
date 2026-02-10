import { createErrorReport } from "@/src/helpers/reports";
import type { ExtensionStateGroups } from "@/src/helpers/state";
import { usePopupState } from "./state";

export const createErrorReportForExtensionGroup = (
	group: keyof Omit<ExtensionStateGroups, symbol>,
) => {
	const { debugInfo, state } = usePopupState.getState();
	const groupState = usePopupState.getState().state?.groups?.[group];
	if (!debugInfo || !state || !groupState || groupState.status !== "error")
		throw new Error(
			"invalid group passed to createErrorReportForExtensionGroup or debugInfo wasn't present",
		);
	return createErrorReport(
		`Extension group "${group}" failed to load`,
		groupState.error,
		state,
		debugInfo,
	);
};
