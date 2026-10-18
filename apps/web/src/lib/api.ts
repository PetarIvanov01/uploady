import { treaty } from "@elysia/eden";
import type { App } from "@uploady/api";

const _api = treaty<App>(
  import.meta.env.VITE_API_URL ?? window.location.origin,
);

export const api = _api.api;

type UploadRoutes = App["~Routes"]["api"]["v1"]["uploads"];

type SingleUploadInitRoute = UploadRoutes["single"]["post"];
type SingleUploadCompleteRoute =
  UploadRoutes["single"][":fileId"]["complete"]["post"];

type MultiUploadRoutes = UploadRoutes["multipart"];
type MultiUploadInitRoute = MultiUploadRoutes["post"];
type MultiUploadPartRoute =
  MultiUploadRoutes[":uploadSessionId"]["parts"][":partNumber"]["post"];
type MultiUploadCompleteRoute =
  MultiUploadRoutes[":uploadSessionId"]["complete"]["post"];
type MultiUploadAbortRoute = MultiUploadRoutes[":uploadSessionId"]["delete"];

export type BodySingleUploadInit = SingleUploadInitRoute["body"];
export type BodySingleUploadComplete = SingleUploadCompleteRoute["body"];
export type ParamsSingleUploadComplete = SingleUploadCompleteRoute["params"];

export type BodyMultiUploadInit = MultiUploadInitRoute["body"];
export type ParamsMultiUploadPart = MultiUploadPartRoute["params"];
export type BodyMultiUploadComplete = MultiUploadCompleteRoute["body"];
export type ParamsMultiUploadComplete = MultiUploadCompleteRoute["params"];
export type ParamsMultiUploadAbort = MultiUploadAbortRoute["params"];
