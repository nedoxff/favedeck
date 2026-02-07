import { Result } from "better-result";

export type Migration<T> = {
	from: number;
	to: number;
	migrator: (old: T) => Result<T, Error> | Promise<Result<T, Error>>;
};

export type MigrationSystem<T> = {
	version: number;
	migrate: (what: T, from: number, to: number) => Promise<Result<T, Error>>;
	migrateIfNeeded: (what: T) => Promise<Result<T, Error>>;
};

export const createMigrationSystem = <T>(options: {
	version: number;
	determineVersion: (
		obj: T,
	) => Result<number, Error> | Promise<Result<number, Error>>;
	migrations: Migration<T>[];
}): MigrationSystem<T> => {
	const migrate: MigrationSystem<T>["migrate"] = async (what, from, to) => {
		if (from === to) return Result.ok(what);
		if (from > to)
			return Result.err(
				new Error(
					`Version from (${from}) cannot be greater than version to (${to})`,
				),
			);

		if (!options.migrations.some((m) => m.to === to))
			return Result.err(
				new Error(
					`Cannot migrate to version ${to} (no migration to this version exists)`,
				),
			);
		let version = from;
		let value = what;
		while (version !== to) {
			const migration = options.migrations.find(
				(m) => m.from === version && m.to === version + 1,
			);
			if (!migration)
				return Result.err(
					new Error(
						`Cannot migrate to version ${to} (no migration exists between versions ${version} and ${version + 1})`,
					),
				);
			const result = await Promise.resolve(migration.migrator(value));
			if (result.isErr())
				return Result.err(
					new Error(
						`Failed to migrate to version ${to} (dependent migration between ${version} and ${version + 1} failed)`,
						{ cause: result.error },
					),
				);
			value = result.value;
			version++;
		}
		return Result.ok(value);
	};

	const migrateIfNeeded: MigrationSystem<T>["migrateIfNeeded"] = async (
		what,
	) => {
		const version = await Promise.resolve(options.determineVersion(what));
		if (version.isErr())
			return Result.err(
				new Error(`Couldn't determine version of object for migration`, {
					cause: version.error,
				}),
			);
		return migrate(what, version.value, options.version);
	};

	return {
		version: options.version,
		migrate,
		migrateIfNeeded,
	};
};
