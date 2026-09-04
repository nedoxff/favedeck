const streamSaverMock = {
	createWriteStream: (
		_filename: string,
		_options?:
			| {
					size?: number | undefined;
					pathname?: string | undefined;
					writableStrategy?: QueuingStrategy<unknown> | undefined;
					readableStrategy?: QueuingStrategy<unknown> | undefined;
			  }
			| undefined,
	) => {
		throw new Error("streamsaver cannot be used in this context");
	},
	WritableStream: null,
	mitm: "",
};
export default streamSaverMock;
