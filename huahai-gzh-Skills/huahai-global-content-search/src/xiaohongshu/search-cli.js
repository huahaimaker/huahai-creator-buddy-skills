#!/usr/bin/env node

const constants = require("../config/constants");
const log = require("../utils/log");
const utils = require("../utils/utils");
const { parseArgs, pick, unknownOptions } = require("../utils/args");
const cli = require("../utils/cli");
const platformClient = require("../platforms/agentReach");

function printHelp() {
  console.log(`
用法: node src/xiaohongshu/search-cli.js <关键词> [选项]

选项:
  --platform -p <平台>    xiaohongshu, bilibili, douyin。默认 xiaohongshu
  --keyword -k <关键词>   搜索关键词
  --type -t <类型>        兼容旧参数，部分平台可能忽略
  --sort -s <排序>        兼容旧参数，部分平台可能忽略
  --time -i <时间>        兼容旧参数，部分平台可能忽略
  --limit -l <数量>       搜索数量，默认 20
  --output -o <格式>      json, raw。默认 json
  --help -h              显示帮助信息

示例:
  node src/xiaohongshu/search-cli.js -k "AI 编程"
  node src/xiaohongshu/search-cli.js --platform bilibili --keyword "AI 编程" --limit 10
  node src/xiaohongshu/search-cli.js --platform douyin --keyword "AI 编程"

说明:
  - 小红书直接尝试 OpenCLI / xiaohongshu-mcp / xhs-cli，最后可用 Guaikei 兜底。
  - B站依次尝试 bili / OpenCLI / B站公开搜索 API。
  - 抖音仅使用 DOUYIN_COMMAND 指向的用户自备只读 CLI。
  - JSON 模式 stdout 只有一个对象；参数错误退出 2，后端错误退出 1。
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
  let keyword;
  let type;
  let sort;
  let time;
  let limit;
  let output;
  try {
    const unknown = unknownOptions(parsed, ["--platform", "-p", "--keyword", "-k", "--type", "-t", "--sort", "-s", "--time", "-i", "--limit", "-l", "--output", "-o", "--help", "-h"]);
    if (unknown.length) throw new cli.UsageError(`未知参数: ${unknown.join(", ")}`);
    if (parsed._.length > 1) throw new cli.UsageError("只能提供一个位置关键词");
    if ((parsed["--keyword"] !== undefined || parsed["-k"] !== undefined) && parsed._.length) {
      throw new cli.UsageError("关键词请使用位置参数或 --keyword，不能同时提供");
    }
    platform = cli.platform(pick(parsed, ["--platform", "-p"], "xiaohongshu"));
    keyword = cli.nonEmpty(pick(parsed, ["--keyword", "-k"], parsed._[0] || ""), "关键词", 100);
    type = cli.integer(pick(parsed, ["--type", "-t"], 0), "内容类型", 0, 2);
    sort = cli.integer(pick(parsed, ["--sort", "-s"], 0), "排序规则", 0, 4);
    time = cli.integer(pick(parsed, ["--time", "-i"], 0), "时间范围", 0, 3);
    limit = cli.integer(pick(parsed, ["--limit", "-l"], 20), "搜索数量", 1, 100);
    output = cli.choice(pick(parsed, ["--output", "-o"], "json"), "输出格式", ["json", "raw"]);
  } catch (error) {
    cli.writeError(error, { operation: "search" });
    return;
  }

  utils.printBanner();
  utils.printInfo(`平台: ${platform}`);
  utils.printInfo(`关键词: ${keyword}`);
  utils.printInfo(`数量: ${limit}`);

  try {
    const result = await platformClient.search(platform, keyword, {
      type,
      sort,
      time,
      limit,
    });
    if (!result || result.raw === undefined || result.raw === null || String(result.raw).trim() === "") {
      throw new Error(`后端 ${result && result.backend ? result.backend : "unknown"} 返回空结果`);
    }
    const finalOutput = {
      status: "success",
      platform,
      backend: result.backend,
      keyword,
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
      `${startTime}_${platform}_${keyword}_${limit}_search.json`,
      JSON.stringify(finalOutput, null, 2),
    );
  } catch (error) {
    cli.writeError(error, { operation: "search", platform, keyword });
  }
}

main().catch((error) => {
  cli.writeError(error, { operation: "search" });
});
