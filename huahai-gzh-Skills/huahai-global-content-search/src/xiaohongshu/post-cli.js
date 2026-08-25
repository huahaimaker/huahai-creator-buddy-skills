#!/usr/bin/env node

const constants = require("../config/constants");
const log = require("../utils/log");
const utils = require("../utils/utils");
const { parseArgs, pick } = require("../utils/args");
const cli = require("../utils/cli");
const platformClient = require("../platforms/agentReach");

function printHelp() {
  console.log(`
用法: node src/xiaohongshu/post-cli.js <主页链接或ID> [选项]

选项:
  --platform -p <平台>  xiaohongshu, bilibili, douyin。默认 xiaohongshu
  --url -u <主页链接或ID> 创作者主页链接或 ID
  --limit -l <数量>     作品数量，部分后端支持。默认 20
  --output -o <格式>    json, raw。默认 json
  --help -h            显示帮助信息

示例:
  node src/xiaohongshu/post-cli.js --url "https://www.xiaohongshu.com/user/profile/xxx?xsec_token=yyy"
  node src/xiaohongshu/post-cli.js --platform bilibili --url "https://space.bilibili.com/123456"
  node src/xiaohongshu/post-cli.js --platform douyin --url "https://www.douyin.com/user/xxx"

说明:
  - 小红书用户作品目前需要 Agent Reach 的 OpenCLI 小红书后端。
  - 默认优先使用 Agent Reach；Agent Reach 小红书后端不可用时，可配置 GUAIKEI_API_TOKEN 兜底。
`);
}

async function main() {
  const startTime = Date.now();
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed["--help"] || parsed["-h"]) {
    printHelp();
    return;
  }

  let platform;
  let url;
  let limit;
  let output;
  try {
    platform = cli.platform(pick(parsed, ["--platform", "-p"], "xiaohongshu"));
    url = cli.nonEmpty(pick(parsed, ["--url", "-u"], parsed._[0] || ""), "主页链接或 ID");
    limit = cli.integer(pick(parsed, ["--limit", "-l"], 20), "作品数量", 1, 1000);
    output = cli.choice(pick(parsed, ["--output", "-o"], "json"), "输出格式", ["json", "raw"]);
  } catch (error) {
    cli.writeError(error, { operation: "user" });
    return;
  }

  utils.printBanner();
  utils.printInfo(`平台: ${platform}`);
  utils.printInfo(`主页/用户: ${url}`);
  utils.printInfo(`作品数量限制: ${limit}`);

  try {
    const result = await platformClient.user(platform, url, { limit });
    const finalOutput = {
      status: "success",
      platform,
      backend: result.backend,
      url,
      limit,
      timestamp: new Date().toISOString(),
      skill_metadata: {
        skill_version: constants.VERSION,
        runtime_version: process.versions.node,
        execution_time: Date.now() - startTime,
      },
      raw: result.raw,
    };

    cli.writeSuccess(output, finalOutput, result.raw);

    await log.taskWrite(
      `${startTime}_${platform}_post.json`,
      JSON.stringify(finalOutput, null, 2),
    );
  } catch (error) {
    cli.writeError(error, { operation: "user", platform, url });
  }
}

main().catch((error) => {
  cli.writeError(error, { operation: "user" });
});
