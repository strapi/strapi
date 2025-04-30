import fs from 'fs';
import path from 'path';

interface CloudUserInfo {
  email?: string;
}

// Define the paths for the temporary file
const STRAPI_TMP_DIR = '.strapi';
const CLOUD_USER_INFO_FILE = 'cloud-user-info.json';

/**
 * Gets the path to the cloud user info file
 */
const getCloudUserInfoPath = () => {
  // Ensure .strapi directory exists
  if (!fs.existsSync(STRAPI_TMP_DIR)) {
    try {
      fs.mkdirSync(STRAPI_TMP_DIR);
    } catch (error) {
      // Ignore errors if directory already exists or cannot be created
      return null;
    }
  }

  return path.join(STRAPI_TMP_DIR, CLOUD_USER_INFO_FILE);
};

/**
 * Saves cloud user info to a temporary file
 */
export const saveCloudUserInfo = (userInfo: CloudUserInfo): boolean => {
  try {
    const filePath = getCloudUserInfoPath();
    if (!filePath) {
      return false;
    }

    fs.writeFileSync(filePath, JSON.stringify(userInfo), 'utf8');

    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Loads cloud user info from the temporary file
 */
export const loadCloudUserInfo = (): CloudUserInfo | null => {
  try {
    const filePath = getCloudUserInfoPath();
    if (!filePath || !fs.existsSync(filePath)) {
      return null;
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const userInfo = JSON.parse(fileContent);

    return userInfo;
  } catch (error) {
    return null;
  }
};

/**
 * Deletes the cloud user info file
 * This should be called after the first admin is created
 */
export const deleteCloudUserInfo = (): boolean => {
  try {
    const filePath = getCloudUserInfoPath();
    if (!filePath || !fs.existsSync(filePath)) {
      return false;
    }

    fs.unlinkSync(filePath);
    return true;
  } catch (error) {
    return false;
  }
};
