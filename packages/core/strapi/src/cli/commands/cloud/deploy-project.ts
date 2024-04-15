import { createCommand } from 'commander';
import fs from 'fs';
import path from 'path';
import type { CLIContext, StrapiCommand } from '../../types';
import { runAction } from '../../utils/helpers';
import { apiConfig } from './config/api';
import { getStoragePath } from './config/local';
import { action as createProjectAction } from './create-project';
import { cloudApiFactory, ProjectInfos } from './services/cli-api';
import * as localSave from './services/strapi-info-save';
import { compressFilesToTar } from './utils/compress-files';
import { notificationServiceFactory } from './utils/notification-service';
import { tokenServiceFactory } from './utils/token';

const FILE_SIZE_LIMIT = 100 * 1024 * 1024; // 100MB

function getPackageJson({ logger }: CLIContext, folderPath: string): Record<string, any> | null {
  const packageJsonPath = path.join(folderPath, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    logger.error(
      "This project seems to be missing a 'package.json' file. It's required for project configuration."
    );
    return null;
  }

  try {
    const packageJson = require(packageJsonPath);

    if (!packageJson.strapi || !packageJson.strapi.uuid) {
      logger.error(
        'This project appears to be missing a Strapi configuration. Please check your project setup and try again.'
      );
      return null;
    }
    return packageJson;
  } catch (error: Error | unknown) {
    logger.debug(error);
    if (error instanceof Error && error.message.includes('Unexpected token')) {
      logger.error(
        'The package.json file seems to have invalid formatting. Please check for syntax errors and try again.'
      );
    } else {
      logger.error('Unable to proceed: The package.json file does not contain valid JSON data.');
    }
  }
  return null;
}

async function upload(ctx: CLIContext, project: ProjectInfos, token: string) {
  const cloudApi = cloudApiFactory(token);
  // * Upload project
  try {
    const storagePath = getStoragePath();
    const projectFolder = path.resolve(process.cwd());
    const packageJson = getPackageJson(ctx, projectFolder);

    if (!packageJson) {
      return;
    }

    ctx.logger.log('📦 Compressing project...');
    const compressedFilename = `${packageJson.strapi.uuid}.tar.gz`;
    try {
      await compressFilesToTar(storagePath, projectFolder, compressedFilename);
      ctx.logger.log('📦 Project compressed successfully!');
    } catch (error: unknown) {
      ctx.logger.error(
        '⚠️ Project compression failed. Try again later or check for large/incompatible files.'
      );
      ctx.logger.debug(error);
    }

    const tarFilePath = path.resolve(storagePath, compressedFilename);
    const fileStats = fs.statSync(tarFilePath);

    if (fileStats.size > FILE_SIZE_LIMIT) {
      return ctx.logger.log(
        'Unable to proceed: Your project is too big to be transferred, please use a git repo instead.'
      );
    }

    ctx.logger.info('🚀 Uploading project...');
    const progressBar = ctx.logger.progressBar(100, 'Upload Progress');

    try {
      await cloudApi.deploy(
        { filePath: tarFilePath, project },
        {
          onUploadProgress: (progressEvent) => {
            const total = progressEvent.total || fileStats.size;
            const percentage = Math.round((progressEvent.loaded * 100) / total);
            progressBar.update(percentage);
          },
        }
      );
      progressBar.update(100);
      ctx.logger.success('✨ Upload finished!');
    } catch (error: any) {
      ctx.logger.error('An error occurred while deploying the project. Please try again later.');
      ctx.logger.debug(error);
    } finally {
      progressBar.stop();
    }
    process.exit(0);
  } catch (error: any) {
    ctx.logger.error('An error occurred while deploying the project. Please try again later.');
    ctx.logger.debug(error);
    process.exit(1);
  }
}

const action = (ctx: CLIContext) => async () => {
  const { getValidToken } = tokenServiceFactory(ctx);
  const token = await getValidToken();

  if (!token) {
    return;
  }

  let { project } = localSave.retrieve();

  if (!project) {
    project = await createProjectAction(ctx);

    if (!project) {
      return;
    }
  }

  const notificationService = notificationServiceFactory(ctx);
  notificationService(`${apiConfig.apiBaseUrl}/notifications`, token);
  return await upload(ctx, project, token);
};

/**
 * `$ deploy project to the cloud`
 */

const command: StrapiCommand = ({ ctx }) => {
  return createCommand('cloud:deploy')
    .alias('deploy')
    .description('Deploy a Strapi Cloud project')
    .action(runAction('deploy', action(ctx)));
};

export { action, command };
