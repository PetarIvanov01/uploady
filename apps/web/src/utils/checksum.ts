/** @knipignore Reserved for multipart implementation. */
export async function calculateChecksum(file: File) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await file.arrayBuffer(),
  );
  const hexadecimal = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

  return `sha256:${hexadecimal}`;
}
