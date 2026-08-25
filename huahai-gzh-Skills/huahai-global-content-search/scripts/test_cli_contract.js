#!/usr/bin/env node

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const search = path.join(root, "src/xiaohongshu/search-cli.js");
const detail = path.join(root, "src/xiaohongshu/detail-cli.js");
const post = path.join(root, "src/xiaohongshu/post-cli.js");
const log = require(path.join(root, "src/utils/log.js"));

function invoke(script, args, env = {}) {
  const result = spawnSync(process.execPath, [script, ...args], {
    encoding: "utf8",
    env: { ...process.env, HUAHAI_SEARCH_LOG_DIR: "", ...env },
  });
  let payload;
  try {
    payload = JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`stdout is not a single JSON object: ${result.stdout}\n${error.message}`);
  }
  return { result, payload };
}

const cases = [
  [search, [], 2],
  [search, ["--keyword", "AI", "--limit", "-1"], 2],
  [search, ["--keyword", "AI", "--unknown", "x"], 2],
  [search, ["AI", "extra"], 2],
  [detail, ["--url", "one", "extra"], 2],
  [post, ["--url", "one", "--limit", "-1"], 2],
];

for (const [script, args, code] of cases) {
  const { result, payload } = invoke(script, args);
  assert.strictEqual(result.status, code, `${path.basename(script)} ${args.join(" ")}`);
  assert.strictEqual(payload.status, "error");
}

const empty = invoke(search, ["--platform", "douyin", "--keyword", "AI"], {
  DOUYIN_COMMAND: "/usr/bin/true",
});
assert.strictEqual(empty.result.status, 1);
assert.strictEqual(empty.payload.status, "error");
assert.match(empty.payload.message, /空输出/);

const success = invoke(search, ["--platform", "douyin", "--keyword", "AI", "--limit", "2"], {
  DOUYIN_COMMAND: "/bin/echo",
});
assert.strictEqual(success.result.status, 0);
assert.strictEqual(success.payload.status, "success");
assert.strictEqual(success.payload.backend, "custom-douyin-command");
assert.ok(success.payload.raw.trim());

const targetSecret = "stderr-secret-token";
const safeTarget = invoke(detail, [
  "--platform", "douyin",
  "--url", `https://www.xiaohongshu.com/explore/a?xsec_token=${targetSecret}`,
], { DOUYIN_COMMAND: "/bin/echo" });
assert.strictEqual(safeTarget.result.status, 0);
assert.ok(!safeTarget.result.stderr.includes(targetSecret));
assert.match(safeTarget.result.stderr, /\[REDACTED\]/);

async function verifyRedactedLogs() {
  const secret = "token-should-not-be-logged";
  const sample = JSON.stringify({
    url: `https://www.xiaohongshu.com/explore/abc?xsec_token=${secret}&source=search`,
    xsec_token: secret,
  });
  const redacted = log.redactSensitive(sample);
  assert.ok(!redacted.includes(secret));
  assert.ok(redacted.includes("[REDACTED]"));

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "huahai-search-log-test-"));
  const previous = process.env.HUAHAI_SEARCH_LOG_DIR;
  try {
    process.env.HUAHAI_SEARCH_LOG_DIR = tmp;
    const output = await log.taskWrite("contract.json", sample);
    const written = fs.readFileSync(output, "utf8");
    assert.ok(!written.includes(secret));
    assert.ok(written.includes("[REDACTED]"));
  } finally {
    if (previous === undefined) delete process.env.HUAHAI_SEARCH_LOG_DIR;
    else process.env.HUAHAI_SEARCH_LOG_DIR = previous;
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

verifyRedactedLogs()
  .then(() => process.stdout.write(`${JSON.stringify({ status: "success", tests: cases.length + 6 })}\n`))
  .catch((error) => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
