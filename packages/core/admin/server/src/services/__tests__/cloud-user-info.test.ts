import fs from 'fs';
import cloudUserInfoService from '../cloud-user-info';

jest.mock('fs');

describe('Cloud User Info Service', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;
  const testFilePath = '.cloud-user-info.json';
  const testUserInfo = { email: 'test@example.com' };
  const testFileContent = JSON.stringify(testUserInfo);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveCloudUserInfo', () => {
    it('should save user info to file', () => {
      mockFs.writeFileSync.mockImplementation(() => undefined);

      const result = cloudUserInfoService.saveCloudUserInfo(testUserInfo);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(testFilePath, testFileContent, 'utf8');
      expect(result).toBe(true);
    });

    it('should return false if file saving fails', () => {
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Test error');
      });

      const result = cloudUserInfoService.saveCloudUserInfo(testUserInfo);

      expect(result).toBe(false);
    });
  });

  describe('loadCloudUserInfo', () => {
    it('should load user info from file', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(testFileContent);

      const result = cloudUserInfoService.loadCloudUserInfo();

      expect(mockFs.existsSync).toHaveBeenCalledWith(testFilePath);
      expect(mockFs.readFileSync).toHaveBeenCalledWith(testFilePath, 'utf8');
      expect(result).toEqual(testUserInfo);
    });

    it('should return null if file does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = cloudUserInfoService.loadCloudUserInfo();

      expect(result).toBeNull();
      expect(mockFs.readFileSync).not.toHaveBeenCalled();
    });

    it('should return null if reading file fails', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('Test error');
      });

      const result = cloudUserInfoService.loadCloudUserInfo();

      expect(result).toBeNull();
    });

    it('should return null if parsing JSON fails', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid json');

      const result = cloudUserInfoService.loadCloudUserInfo();

      expect(result).toBeNull();
    });
  });

  describe('deleteCloudUserInfo', () => {
    it('should delete the user info file', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.unlinkSync.mockImplementation(() => undefined);

      const result = cloudUserInfoService.deleteCloudUserInfo();

      expect(mockFs.existsSync).toHaveBeenCalledWith(testFilePath);
      expect(mockFs.unlinkSync).toHaveBeenCalledWith(testFilePath);
      expect(result).toBe(true);
    });

    it('should return false if file does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = cloudUserInfoService.deleteCloudUserInfo();

      expect(result).toBe(false);
      expect(mockFs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should return false if deleting file fails', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.unlinkSync.mockImplementation(() => {
        throw new Error('Test error');
      });

      const result = cloudUserInfoService.deleteCloudUserInfo();

      expect(result).toBe(false);
    });
  });
});
