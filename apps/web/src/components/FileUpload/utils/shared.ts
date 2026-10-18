export const minimumPhaseDurationMs = 350;

export type UploadPhase = "preparing" | "initializing" | "verifying";
export type UploadFileOptions = {
  name: string;
  body: Blob;
  onPhase: (phase: UploadPhase) => void;
  onProgress: (loaded: number, expiresAt: string) => void;
  preservePhaseDuration: boolean;
};

export async function waitForMinimumDuration(startedAt: number) {
  const remaining = minimumPhaseDurationMs - (performance.now() - startedAt);

  if (remaining > 0) {
    await new Promise((resolve) => window.setTimeout(resolve, remaining));
  }
}
