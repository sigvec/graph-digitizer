import {
    CURRENT_PROJECT_FORMAT_VERSION,
    migrateProjectFormat,
    type ProjectFormatMigration,
} from '../projectMigrations';

describe('migrateProjectFormat', () => {
    it('accepts the current V1 format without changing the input', () => {
        const project = { formatVersion: 1, name: 'Example', nested: { keep: true } };
        const result = migrateProjectFormat(project);

        expect(result).toEqual(project);
        expect(result).not.toBe(project);
        expect(result.nested).not.toBe(project.nested);
        expect(project.formatVersion).toBe(1);
        expect(CURRENT_PROJECT_FORMAT_VERSION).toBe(1);
    });

    it('rejects missing, invalid, and unsupported future versions', () => {
        expect(() => migrateProjectFormat({ name: 'legacy' })).toThrow(
            'missing or invalid formatVersion',
        );
        expect(() => migrateProjectFormat({ formatVersion: 0 })).toThrow(
            'missing or invalid formatVersion',
        );
        expect(() => migrateProjectFormat({ formatVersion: 1.5 })).toThrow(
            'missing or invalid formatVersion',
        );
        expect(() => migrateProjectFormat({ formatVersion: 2 })).toThrow(
            'unsupported future formatVersion 2',
        );
    });

    it('rejects an invalid current schema version', () => {
        expect(() => migrateProjectFormat({ formatVersion: 1 }, new Map(), 0)).toThrow(
            'invalid current schema version',
        );
        expect(() => migrateProjectFormat({ formatVersion: 1 }, new Map(), 1.5)).toThrow(
            'invalid current schema version',
        );
    });

    it('applies registered migrations sequentially', () => {
        const v1ToV2: ProjectFormatMigration = (project) => ({
            ...project,
            formatVersion: 2,
            middle: true,
        });
        const v2ToV3: ProjectFormatMigration = (project) => ({
            ...project,
            formatVersion: 3,
            latest: true,
        });
        const migrations = new Map<number, ProjectFormatMigration>([
            [1, v1ToV2],
            [2, v2ToV3],
        ]);

        expect(migrateProjectFormat({ formatVersion: 1, name: 'Example' }, migrations, 3)).toEqual({
            formatVersion: 3,
            name: 'Example',
            middle: true,
            latest: true,
        });
    });

    it('fails if a required migration is missing', () => {
        expect(() => migrateProjectFormat({ formatVersion: 1 }, new Map(), 2)).toThrow(
            'no migration registered from V1 to V2',
        );
    });

    it('fails if a migration throws and does not mutate the original input', () => {
        const original = { formatVersion: 1, name: 'Original' };
        const migration: ProjectFormatMigration = () => {
            throw new Error('bad conversion');
        };

        expect(() => migrateProjectFormat(original, new Map([[1, migration]]), 2)).toThrow(
            'bad conversion',
        );
        expect(original).toEqual({ formatVersion: 1, name: 'Original' });
    });

    it('does not mutate nested input data when a migration fails', () => {
        const original = {
            formatVersion: 1,
            device: { name: 'Original device' },
            datasets: [{ points: [{ x: 1, y: 2 }] }],
        };

        const migration: ProjectFormatMigration = (project) => {
            const device = project.device as { name: string };
            device.name = 'Mutated device';

            const datasets = project.datasets as {
                points: { x: number; y: number }[];
            }[];
            datasets[0].points[0].x = 999;

            throw new Error('conversion failed');
        };

        expect(() => migrateProjectFormat(original, new Map([[1, migration]]), 2)).toThrow(
            'conversion failed',
        );

        expect(original).toEqual({
            formatVersion: 1,
            device: { name: 'Original device' },
            datasets: [{ points: [{ x: 1, y: 2 }] }],
        });
    });

    it('preserves malformed nested values for the validator instead of normalizing them', () => {
        const project = {
            formatVersion: 1,
            optionalValue: undefined,
            invalidNumber: Number.NaN,
            nested: { keep: true },
        };

        const result = migrateProjectFormat(project);

        expect(Object.prototype.hasOwnProperty.call(result, 'optionalValue')).toBe(true);
        expect(result.optionalValue).toBeUndefined();
        expect(Number.isNaN(result.invalidNumber)).toBe(true);
        expect(result.nested).toEqual({ keep: true });
        expect(result.nested).not.toBe(project.nested);
    });

    it('rejects non-plain objects without mutating the original', () => {
        const original = {
            formatVersion: 1,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
        };

        expect(() => migrateProjectFormat(original)).toThrow('cannot safely copy project data');
        expect(original.createdAt).toBeInstanceOf(Date);
    });

    it('rejects migrations that do not advance exactly one version', () => {
        const migration: ProjectFormatMigration = (project) => ({
            ...project,
            formatVersion: 3,
        });

        expect(() =>
            migrateProjectFormat({ formatVersion: 1 }, new Map([[1, migration]]), 2),
        ).toThrow('migration must return formatVersion 2');
    });

    it('preserves an own __proto__ property without changing the clone prototype', () => {
        const project = JSON.parse('{"formatVersion":1,"__proto__":{"polluted":true}}') as Record<
            string,
            unknown
        >;

        const result = migrateProjectFormat(project);

        expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(true);
        expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
        expect(Object.prototype.hasOwnProperty.call(result, 'polluted')).toBe(false);
        expect(result).toEqual(project);
    });
});
