#!/usr/bin/env node

const constants = require("../config/constants");
const log = require("../utils/log");
const utils = require("../utils/utils");
const { parseArgs, pick, unknownOptions } = require("../utils/args");
const cli = require("../utils/cli");
const platformClient = require("../platforms/agentReach");

function printHelp() {
  console.log(`
用法: node src/xiaohongshu/detail-cli.js <链接或ID> [选项]

选项:
  --platform -p <平台>  xiaohongshu, bilibili, douyin。默认 xiaohongshu
  --url -u <链接或ID>   笔记/视频链接或 ID
  --limit -l <数量>     评论数量，部分后端支持。默认 0
  --output -o <格式>    json, raw。默认 json
  --help -h            显示帮助信息

示例:
  node src/xiaohongshu/detail-cli.js --url "https://www.xiaohongshu.com/explore/xxx?xsec_token=yyy" --limit 20
  node src/xiaohongshu/detail-cli.js --platform bilibili --url "BVxxxx"
  node src/xiaohongshu/detail-cli.js --platform douyin --url "https://www.douyin.com/video/xxx"

说明:
  - 小红书详情仍建议使用搜索结果里的完整 URL，包含 xsec_token。
  - 小红书直接尝试可用本地后端，最后可用 GUAIKEI_API_TOKEN 兜底。
  - B站依次尝试 bili / OpenCLI / 公开详情 API；公开 API 会核验业务码和必要字段。
  - 抖音仅使用 DOUYIN_COMMAND 指向的用户自备只读 CLI。
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
    const unknown = unknownOptions(parsed, ["--platform", "-p", "--url", "-u", "--limit", "-l", "--output", "-o", "--help", "-h"]);
    if (unknown.length) throw new cli.UsageError(`未知参数: ${unknown.join(", ")}`);
    if (parsed._.length > 1) throw new cli.UsageError("只能提供一个位置链接或 ID");
    if ((parsed["--url"] !== undefined || parsed["-u"] !== undefined) && parsed._.length) {
      throw new cli.UsageError("链接或 ID 请使用位置参数或 --url，不能同时提供");
    }
    platform = cli.platform(pick(parsed, ["--platform", "-p"], "xiaohongshu"));
    url = cli.nonEmpty(pick(parsed, ["--url", "-u"], parsed._[0] || ""), "链接或 ID");
    limit = cli.integer(pick(parsed, ["--limit", "-l"], 0), "评论数量", 0, 1000);
    output = cli.choice(pick(parsed, ["--output", "-o"], "json"), "输出格式", ["json", "raw"]);
  } catch (error) {
    cli.writeError(error, { operation: "detail" });
    return;
  }

  utils.printBanner();
  utils.printInfo(`平台: ${platform}`);
  utils.printInfo(`目标: ${log.redactSensitive(url)}`);
  utils.printInfo(`评论数量限制: ${limit}`);

  try {
    const result = await platformClient.detail(platform, url, { limit });
    if (!result || result.raw === undefined || result.raw === null || String(result.raw).trim() === "") {
      throw new Error(`后端 ${result && result.backend ? result.backend : "unknown"} 返回空结果`);
    }
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
      `${startTime}_${platform}_detail.json`,
      JSON.stringify(finalOutput, null, 2),
    );
  } catch (error) {
    cli.writeError(error, { operation: "detail", platform, url });
  }
}

main().catch((error) => {
  cli.writeError(error, { operation: "detail" });
});
