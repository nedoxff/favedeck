import pica from "pica";

const BUNDLE_SIZES = [512, 256, 128, 64, 32, 16];
export const generateColoredIconBundle = async (color: string) => {
	const start = performance.now();

	const svg = (
		await (
			await fetch(browser.runtime.getURL("/img/icons/marten-colored.svg"))
		).text()
	).replaceAll("currentColor", color);
	const url = URL.createObjectURL(
		new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
	);
	const image = await loadImage(url);

	const bundle: Record<number, Array<number>> = {};
	const canvas = document.createElement("canvas");
	canvas.width = 512;
	canvas.height = 512;
	const ctx = canvas.getContext("2d", { willReadFrequently: true });
	if (!ctx) throw new Error();
	ctx.drawImage(image, 0, 0);
	const downscaledCanvas = document.createElement("canvas");
	const downscaledCtx = downscaledCanvas.getContext("2d", {
		willReadFrequently: true,
	});
	if (!downscaledCtx) throw new Error();

	const resizer = pica({ features: ["js"] });
	for (const size of BUNDLE_SIZES) {
		downscaledCanvas.width = size;
		downscaledCanvas.height = size;
		await resizer.resize(canvas, downscaledCanvas);
		bundle[size] = Array.from(
			downscaledCtx.getImageData(0, 0, size, size).data,
		);
	}

	console.log(
		"rendered a bundle of",
		BUNDLE_SIZES.length,
		"icons in",
		Math.round(performance.now() - start),
		"ms",
	);
	return bundle;
};

const loadImage = (src: string): Promise<HTMLImageElement> =>
	new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = (err) => reject(err);
		img.src = src;
	});
