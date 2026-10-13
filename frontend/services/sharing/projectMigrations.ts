/**
 * Project-format migration entry point.
 *
 * Migrations are keyed by the version they consume: V1 -> V2 is registered at key 1.
 * Each migration must return a plain object with formatVersion incremented by exactly one.
 * Keep migrations deterministic and side-effect free; persistence is the caller's responsibility.
 */
export const CURRENT_PROJECT_FORMAT_VERSION = 1;

export type ProjectFormatMigration = (value: Record<string, unknown>) => Record<string, unknown>;

export type ProjectMigrationRegistry = ReadonlyMap<number, ProjectFormatMigration>;

// There are currently no verified historical schema transitions. Do not add a migration
// until both its source schema and its intended output are documented and covered by tests.
const PROJECT_MIGRATIONS: ProjectMigrationRegistry = new Map();

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Copy an enumerable own property without invoking special setters such as __proto__.
 */
function defineCopiedProperty(target: Record<string, unknown>, key: string, value: unknown): void {
    Object.defineProperty(target, key, {
        value,
        enumerable: true,
        configurable: true,
        writable: true,
    });
}

/**
 * Recursively copy project data so a migration cannot mutate the original through
 * shared nested references. Preserve values for validation rather than normalizing them
 * through JSON serialization. Reject non-plain objects because project payloads are data.
 *
 * Circular references are copied safely, although the project validators may reject them.
 */
function cloneProjectValue(value: unknown, seen = new WeakMap<object, unknown>()): unknown {
    if (value === null || typeof value !== 'object') {
        return value;
    }

    const existing = seen.get(value);
    if (existing !== undefined) {
        return existing;
    }

    if (Array.isArray(value)) {
        const clone: unknown[] = [];
        seen.set(value, clone);

        for (const item of value) {
            clone.push(cloneProjectValue(item, seen));
        }

        return clone;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
        throw new Error('Project contains a non-plain object');
    }

    const clone: Record<string, unknown> = {};
    seen.set(value, clone);

    for (const [key, item] of Object.entries(value)) {
        defineCopiedProperty(clone, key, cloneProjectValue(item, seen));
    }

    return clone;
}

function cloneProjectData(value: Record<string, unknown>): Record<string, unknown> {
    try {
        const clone = cloneProjectValue(value);

        if (!isRecord(clone)) {
            throw new Error('Cloned project must be an object');
        }

        return clone;
    } catch (error) {
        throw new Error(
            `Project migration failed: cannot safely copy project data: ${String(error)}`,
        );
    }
}

/**
 * Convert a supported project payload to the current format without mutating the input.
 *
 * This function intentionally does not perform structural validation. Callers must validate
 * the returned candidate with the appropriate local or portable schema validator.
 */
export function migrateProjectFormat(
    value: unknown,
    migrations: ProjectMigrationRegistry = PROJECT_MIGRATIONS,
    currentVersion = CURRENT_PROJECT_FORMAT_VERSION,
): Record<string, unknown> {
    if (!isRecord(value)) {
        throw new Error('Project migration failed: project must be an object');
    }

    let candidate = cloneProjectData(value);
    let version = candidate.formatVersion;

    if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
        throw new Error('Project migration failed: missing or invalid formatVersion');
    }

    if (!Number.isInteger(currentVersion) || currentVersion < 1) {
        throw new Error('Project migration failed: invalid current schema version');
    }

    if (version > currentVersion) {
        throw new Error(`Project migration failed: unsupported future formatVersion ${version}`);
    }

    while (version < currentVersion) {
        const migration = migrations.get(version);

        if (!migration) {
            throw new Error(
                `Project migration failed: no migration registered from V${version} to V${version + 1}`,
            );
        }

        let next: Record<string, unknown>;

        try {
            // Give each migration its own deep copy. If it mutates nested values and then
            // throws, neither the original input nor the previous candidate is affected.
            next = migration(cloneProjectData(candidate));
        } catch (error) {
            throw new Error(
                `Project migration failed from V${version} to V${version + 1}: ${String(error)}`,
            );
        }

        if (!isRecord(next) || next.formatVersion !== version + 1) {
            throw new Error(
                `Project migration failed from V${version} to V${version + 1}: migration must return formatVersion ${version + 1}`,
            );
        }

        // Copy the result so later migrations do not share references with objects
        // retained by an earlier migration.
        candidate = cloneProjectData(next);
        version += 1;
    }

    return candidate;
}
