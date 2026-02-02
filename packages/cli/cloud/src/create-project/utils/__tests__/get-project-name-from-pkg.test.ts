import { CLIContext } from '../../../types';
import { loadPkg } from '../../../utils/pkg';
import { getProjectNameFromPackageJson } from '../get-project-name-from-pkg';

// Mock the loadPkg function
jest.mock('../../../utils/pkg', () => ({
  loadPkg: jest.fn(),
}));

describe('getProjectNameFromPackageJson', () => {
  const mockCtx: CLIContext = {} as CLIContext;

  it('should return the project name from package.json', async () => {
    (loadPkg as jest.Mock).mockResolvedValue({ name: 'test-project' });
    const projectName = await getProjectNameFromPackageJson(mockCtx);
    expect(projectName).toEqual('test-project');
  });

  it('should return default project name if package.json has no name', async () => {
    (loadPkg as jest.Mock).mockResolvedValue({});
    const projectName = await getProjectNameFromPackageJson(mockCtx);
    expect(projectName).toEqual('my-strapi-project');
  });

  it('should return default project name on error', async () => {
    (loadPkg as jest.Mock).mockRejectedValue(new Error('Failed to load package.json'));
    const projectName = await getProjectNameFromPackageJson(mockCtx);
    expect(projectName).toEqual('my-strapi-project');
  });
});
