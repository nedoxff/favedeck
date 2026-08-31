export const formatTimeAgo = (date: Date) => {
	const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
	const elapsed = date.getTime() - Date.now();
	const units = {
		year: 24 * 60 * 60 * 1000 * 365,
		month: 24 * 60 * 60 * 1000 * 30,
		day: 24 * 60 * 60 * 1000,
		hour: 60 * 60 * 1000,
		minute: 60 * 1000,
		second: 1000,
	};

	for (const [unit, amount] of Object.entries(units)) {
		if (Math.abs(elapsed) >= amount || unit === "second") {
			const difference = Math.round(elapsed / amount);
			return rtf.format(difference, unit as Intl.RelativeTimeFormatUnit);
		}
	}
};
