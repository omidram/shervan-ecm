import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const forwarded = process.argv.slice(2);

const child = spawn(process.execPath, [nextBin, "start", ...forwarded], {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    __NEXT_NO_MIDDLEWARE_URL_NORMALIZE: "1",
  },
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
