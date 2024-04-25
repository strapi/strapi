import fs from 'fs';
import path from 'path';
import { AxiosError } from 'axios';
import * as crypto from 'node:crypto';
import { apiConfig } from '../config/api';
import { compressFilesToTar } from '../utils/compress-files';
import createProjectAction from '../create-project/action';
import type { CLIContext, ProjectInfos } from '../types';
import { getTmpStoragePath } from '../config/local';
import { cloudApiFactory, tokenServiceFactory, local } from '../services';
import { notificationServiceFactory } from '../utils/notification-service';
import { loadPkg } from '../utils/pkg';
import { buildLogsServiceFactory } from '../utils/build-logs-service';

const FILE_SIZE_LIMIT = 100 * 1024 * 1024; // 100MB

type PackageJson = {
  name: string;
  strapi?: {
    uuid: string;
  };
};

async function upload(ctx: CLIContext, project: ProjectInfos, token: string) {
  const cloudApi = cloudApiFactory(token);
  // * Upload project
  try {
    const storagePath = getTmpStoragePath();
    const projectFolder = path.resolve(process.cwd());
    const packageJson = (await loadPkg(ctx)) as PackageJson;

    if (!packageJson) {
      ctx.logger.error(
        'Unable to deploy the project. Please make sure the package.json file is correctly formatted.'
      );
      return;
    }

    ctx.logger.log('📦 Compressing project...');
    // hash packageJson.name to avoid conflicts
    const hashname = crypto.createHash('sha512').update(packageJson.name).digest('hex');
    const compressedFilename = `${hashname}.tar.gz`;
    try {
      ctx.logger.debug(
        'Compression parameters\n',
        `Storage path: ${storagePath}\n`,
        `Project folder: ${projectFolder}\n`,
        `Compressed filename: ${compressedFilename}`
      );
      await compressFilesToTar(storagePath, projectFolder, compressedFilename);
      ctx.logger.log('📦 Project compressed successfully!');
    } catch (error: unknown) {
      ctx.logger.error(
        '⚠️ Project compression failed. Try again later or check for large/incompatible files.'
      );
      ctx.logger.debug(error);
      process.exit(1);
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
      const { data } = (await cloudApi.deploy(
        { filePath: tarFilePath, project },
        {
          onUploadProgress(progressEvent) {
            const total = progressEvent.total || fileStats.size;
            const percentage = Math.round((progressEvent.loaded * 100) / total);
            progressBar.update(percentage);
          },
        }
      )) as { data: { buildId: string } };

      progressBar.update(100);
      progressBar.stop();
      ctx.logger.success('✨ Upload finished!');
      return data.buildId;
    } catch (error: any) {
      progressBar.stop();
      if (error instanceof AxiosError && error.response?.data) {
        if (error.response.status === 404) {
          ctx.logger.error(
            `The project does not exist. Remove the ${local.LOCAL_SAVE_FILENAME} file and try again.`
          );
        } else {
          ctx.logger.error(error.response.data);
        }
      } else {
        ctx.logger.error('An error occurred while deploying the project. Please try again later.');
      }

      ctx.logger.debug(JSON.stringify(error));
    } finally {
      fs.rmSync(tarFilePath, { force: true });
    }
    process.exit(0);
  } catch (e: any) {
    ctx.logger.error('An error occurred while deploying the project. Please try again later.');
    ctx.logger.debug(JSON.stringify(e));
    process.exit(1);
  }
}

async function getProject(ctx: CLIContext) {
  const { project } = local.retrieve();
  if (!project) {
    try {
      return await createProjectAction(ctx)();
    } catch (error: any) {
      ctx.logger.error('An error occurred while deploying the project. Please try again later.');
      ctx.logger.debug(JSON.stringify(error));
      process.exit(1);
    }
  }
  return project;
}

export default async (ctx: CLIContext) => {
  const { getValidToken } = tokenServiceFactory(ctx);
  const token = await getValidToken();

  if (!token) {
    return;
  }

  const project = await getProject(ctx);

  if (!project) {
    return;
  }

  const notificationService = notificationServiceFactory(ctx);
  const buildLogsService = buildLogsServiceFactory(ctx);

  const buildId = await upload(ctx, project, token);

  try {
    await Promise.all([
      notificationService(`${apiConfig.apiBaseUrl}/notifications`, token),
      buildLogsService(`${apiConfig.apiBaseUrl}/v1/logs/${buildId}`, token),
    ]);
  } catch (e: Error | unknown) {
    if (e instanceof Error) {
      ctx.logger.error(e.message);
    }
  }
};
