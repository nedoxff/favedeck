export const compress = async (str: string) => {
	const blob = new Blob([str], { type: "text/plain" });
	const response = new Response(
		blob.stream().pipeThrough(new CompressionStream("gzip")),
	);
	return await response.blob();
};
export const compressObject = async (obj: unknown) =>
	await compress(JSON.stringify(obj));

export const decompress = async (data: Blob) => {
	const response = new Response(
		data.stream().pipeThrough(new DecompressionStream("gzip")),
	);
	return await response.text();
};
export const decompressObject = async (data: Blob) =>
	JSON.parse(await decompress(data));
