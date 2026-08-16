export function folderApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error !== "object" || error === null || !("value" in error)) {
    return fallback;
  }

  const value = error.value;

  if (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof value.message === "string" &&
    value.message.length > 0
  ) {
    return value.message;
  }

  return fallback;
}

export function unknownErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
