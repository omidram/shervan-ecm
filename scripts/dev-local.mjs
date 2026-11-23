import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");

const next = spawn(process.execPath, [nextBin, "dev", "--hostname", "127.0.0.1", "--port", "3004"], {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    __NEXT_NO_MIDDLEWARE_URL_NORMALIZE: "1",
  },
});

next.on("exit", (code) => {
  process.exit(code ?? 0);
});
