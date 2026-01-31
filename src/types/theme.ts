// note: not every field is included here
export type FavedeckThemeExtensions = {
	chirpFontStylesheet?: string;
};

export type TwitterTheme = {
	colors: Record<string, string>;
	key: string;
	highContrastEnabled: boolean;
	paletteName: string;
	primaryColorName: string;
	scale: string;
	baseFontSize: number;
	fontFamilies: Record<string, string>;
};

export type TwitterThemeModule = {
	_activeOptions: {
		highContrastEnabled: boolean;
		chirpFontEnabled: boolean;
	};
	_activePrimaryColor: string;
	_activePalette: string;
	_activeScale: string;
	_activeTheme: TwitterTheme;
	_themeChangeListeners: ((newTheme: TwitterTheme) => void)[];
};
