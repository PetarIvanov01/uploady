import {
  fileRepository,
  type UploadSessionMode,
  type UploadSessionRecord,
} from "../../repositories/file.repository";

type UploadCompletionClaimResult =
  | { outcome: "CLAIMED"; session: UploadSessionRecord }
  | { outcome: "COMPLETED"; session: UploadSessionRecord }
  | { outcome: "COMPLETING"; session: UploadSessionRecord }
  | { outcome: "INVALID_STATE"; session: UploadSessionRecord }
  | { outcome: "NOT_FOUND" };

interface ResolveUploadCompletionClaimInput {
  mode: UploadSessionMode;
  session: UploadSessionRecord;
  userId: string;
}

export async function resolveUploadCompletionClaim({
  mode,
  session,
  userId,
}: ResolveUploadCompletionClaimInput): Promise<UploadCompletionClaimResult> {
  if (session.status === "COMPLETED") {
    return { outcome: "COMPLETED", session };
  }

  if (session.status === "COMPLETING") {
    return { outcome: "COMPLETING", session };
  }

  if (session.status !== "UPLOADING") {
    return { outcome: "INVALID_STATE", session };
  }

  const claimed = await fileRepository.claimUploadSessionCompletion(
    session,
    mode,
  );

  if (claimed) {
    return {
      outcome: "CLAIMED",
      session: { ...session, status: "COMPLETING" },
    };
  }

  const latestSession = await fileRepository.findUploadSession({
    mode,
    uploadSessionId: session.uploadSessionId,
    userId,
  });

  if (!latestSession) {
    return { outcome: "NOT_FOUND" };
  }

  if (latestSession.status === "COMPLETED") {
    return { outcome: "COMPLETED", session: latestSession };
  }

  return latestSession.status === "COMPLETING"
    ? { outcome: "COMPLETING", session: latestSession }
    : { outcome: "INVALID_STATE", session: latestSession };
}
