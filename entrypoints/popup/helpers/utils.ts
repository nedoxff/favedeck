import {
	createDebugInfoReport,
	createErrorReport,
} from "@/src/helpers/reports";
import { usePopupState } from "./state";

export const createErrorReportForExtensionGroups = () => {
	const { debugInfo, state } = usePopupState.getState();
	if (!debugInfo || !state)
		throw new Error(
			"invalid group passed to createErrorReportForExtensionGroup or debugInfo wasn't present",
		);
	const errorGroups = Object.entries(state.groups).filter(
		(e) => e[1].status === "error",
	);
	if (errorGroups.length === 0) throw new Error("no error groups detected");
	return `${errorGroups
		.map((g) =>
			createErrorReport(
				`Extension group ${g[0]} failed to load`,
				(g[1] as { status: "error"; error: unknown }).error,
			),
		)
		.join("\n\n")}\n\n${createDebugInfoReport(state, debugInfo)}`;
};
