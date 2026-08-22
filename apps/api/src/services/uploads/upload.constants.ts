export const SINGLE_UPLOAD_LIMIT_BYTES = 200 * 1024 * 1024;

/** @knipignore Reserved for multipart implementation. */
export const MULTIPART_MIN_PART_BYTES = 5 * 1024 * 1024;
/** @knipignore Reserved for multipart implementation. */
export const MULTIPART_DEFAULT_PART_BYTES = 100 * 1024 * 1024;
/** @knipignore Reserved for multipart implementation. */
export const MULTIPART_MAX_PART_BYTES = 5 * 1024 * 1024 * 1024;
export const MULTIPART_MAX_PARTS = 10_000;
export const MULTIPART_MAX_FILE_BYTES =
  5 * 1024 * 1024 * 1024 * 1024 - 5 * 1024 * 1024 * 1024;
