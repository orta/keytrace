import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const TAP_BIN = process.env.TAP_BIN || "tap";
const TAP_HOST = process.env.TAP_HOST || "127.0.0.1";
const TAP_PORT = process.env.TAP_PORT || "2480";
const TAP_URL = `http://${TAP_HOST}:${TAP_PORT}`;
const DATA_DIR = process.env.KEYTRACE_DATA_DIR || REPO_ROOT;
const NUXT_ENTRY =
  process.env.KEYTRACE_SERVER_ENTRY ||
  path.join(REPO_ROOT, "apps", "keytrace.dev", ".output", "server", "index.mjs");
const REVERSE_LOOKUP_DB =
  process.env.KEYTRACE_REVERSE_LOOKUP_DB || path.join(DATA_DIR, "reverse-lookup.sqlite");

const children = new Map();
let shuttingDown = false;

function pipeOutput(name, stream) {
  let buf = "";
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    buf += chunk;
    let i;
    while ((i = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, i);
      buf = buf.slice(i + 1);
      console.log(`[${name}] ${line}`);
    }
  });
  stream.on("end", () => {
    if (buf.length) console.log(`[${name}] ${buf}`);
  });
}

function start(name, cmd, args, { env, cwd } = {}) {
  console.log(`[host] starting ${name}: ${cmd} ${args.join(" ")}`);
  const proc = spawn(cmd, args, {
    env: { ...process.env, ...env },
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
  });
  pipeOutput(name, proc.stdout);
  pipeOutput(name, proc.stderr);
  children.set(name, proc);

  proc.on("error", (err) => {
    console.error(`[host] failed to spawn ${name}:`, err);
    if (!shuttingDown) shutdown(1);
  });

  proc.on("exit", (code, signal) => {
    children.delete(name);
    if (shuttingDown) {
      console.log(`[host] ${name} exited (${signal ?? code}) during shutdown`);
      return;
    }
    console.error(`[host] ${name} exited unexpectedly (${signal ?? code}); shutting down`);
    shutdown(code ?? 1);
  });

  return proc;
}

function shutdown(exitCode) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  console.log(`[host] shutting down (${children.size} child process(es))`);

  for (const [name, proc] of children) {
    try {
      proc.kill("SIGTERM");
    } catch (err) {
      console.error(`[host] error sending SIGTERM to ${name}:`, err);
    }
  }

  const force = setTimeout(() => {
    for (const [name, proc] of children) {
      console.error(`[host] force killing ${name}`);
      try {
        proc.kill("SIGKILL");
      } catch {}
    }
    process.exit(exitCode);
  }, 10_000);
  force.unref();

  const wait = setInterval(() => {
    if (children.size === 0) {
      clearInterval(wait);
      clearTimeout(force);
      process.exit(exitCode);
    }
  }, 100);
}

async function waitForTap(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await fetch(url, { method: "GET" });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  throw new Error(`tap did not become reachable at ${url} within ${timeoutMs}ms`);
}

process.on("SIGTERM", () => shutdown(0));
process.on("SIGINT", () => shutdown(0));

start(
  "tap",
  TAP_BIN,
  ["run", "--disable-acks=true"],
  {
    env: {
      TAP_SIGNAL_COLLECTION: "dev.keytrace.claim",
      TAP_COLLECTION_FILTERS: "dev.keytrace.claim",
    },
    cwd: DATA_DIR,
  },
);

try {
  await waitForTap(TAP_URL);
  console.log(`[host] tap is reachable at ${TAP_URL}`);
} catch (err) {
  console.error(`[host] ${err.message}`);
  shutdown(1);
}

if (!shuttingDown) {
  start("keytrace", process.execPath, [NUXT_ENTRY], {
    env: {
      KEYTRACE_TAP_URL: TAP_URL,
      KEYTRACE_REVERSE_LOOKUP_DB: REVERSE_LOOKUP_DB,
    },
    cwd: DATA_DIR,
  });
}
