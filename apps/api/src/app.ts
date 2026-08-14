import { Elysia } from "elysia";
import { cors } from "@elysia/cors";
import { database } from "./database";
import { initFileRepository } from "./repositories/file.repository";
import { createUploads } from "./routes/uploads";
import { health } from "./routes/health";
import { initListFiles, type ListFilesHandler } from "./services/list-files";
import {
  initRetrieveFile,
  type RetrieveFileHandler,
} from "./services/retrieve-file";
import { initUploadFile, type UploadFileHandler } from "./services/upload-file";

const frontendOrigin =
  process.env.NODE_ENV === "production" ? "" : "http://localhost:5173";

export interface AppDependencies {
  listFiles: ListFilesHandler;
  retrieveFile: RetrieveFileHandler;
  uploadFile: UploadFileHandler;
}

const fileRepository = initFileRepository({ database });

const dependencies: AppDependencies = {
  listFiles: initListFiles({ fileRepository }),
  retrieveFile: initRetrieveFile({ fileRepository }),
  uploadFile: initUploadFile({ fileRepository }),
};

export const createApp = (appDependencies: AppDependencies = dependencies) =>
  new Elysia({ prefix: "/api/v1" })
    .use(
      cors({
        origin: frontendOrigin,
      }),
    )
    .use(health)
    .use(createUploads(appDependencies));

export const app = createApp();

export type App = typeof app;
