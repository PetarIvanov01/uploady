import { spawnSync } from "node:child_process";

const dockerCommand = process.platform === "win32" ? "docker.exe" : "docker";

const runDockerCompose = (args) => {
  const result = spawnSync(dockerCommand, ["compose", ...args], {
    stdio: "inherit",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};

runDockerCompose(["up", "--build", "--detach", "--wait", "rustfs"]);
runDockerCompose(["run", "--build", "--rm", "rustfs-init"]);
