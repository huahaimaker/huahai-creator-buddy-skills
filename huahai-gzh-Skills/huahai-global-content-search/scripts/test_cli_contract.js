#!/usr/bin/env node

const assert = require("assert");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const search = path.join(root, "src/xiaohongshu/search-cli.js");
const detail = path.join(root, "src/xiaohongshu/detail-cli.js");
const post = path.join(root, "src/xiaohongshu/post-cli.js");

function invoke(script, args, env = {}) {
  const result = spawnSync(process.execPath, [script, ...args], {
    encoding: "utf8",
    env: { ...process.env, ...env },
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

process.stdout.write(`${JSON.stringify({ status: "success", tests: cases.length + 2 })}\n`);
