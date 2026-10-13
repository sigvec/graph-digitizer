import type { Project } from '../Project';
import { shareProject } from '../shareProject';
import { serializeProject } from '../serializeProject';

jest.mock('../serializeProject', () => ({
    serializeProject: jest.fn(),
}));

const mockSerializeProject = serializeProject as jest.MockedFunction<typeof serializeProject>;

describe('shareProject validation', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        jest.clearAllMocks();
        globalThis.fetch = jest.fn() as typeof fetch;
    });

    afterAll(() => {
        globalThis.fetch = originalFetch;
    });

    it('rejects an invalid project before serialization or network access', async () => {
        const invalidProject = { formatVersion: 1, name: 'Incomplete' } as Project;

        await expect(shareProject(invalidProject)).rejects.toThrow('INVALID_PROJECT');

        expect(mockSerializeProject).not.toHaveBeenCalled();
        expect(globalThis.fetch).not.toHaveBeenCalled();
    });
});
