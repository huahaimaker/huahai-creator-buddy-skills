const https = require("https");
const { spawnSync } = require("child_process");
const guaikei = require("./guaikei");

function commandExists(command) {
  const result = spawnSync("sh", ["-lc", `command -v ${command}`], { encoding: "utf8" });
  return result.status === 0;
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    timeout: options.timeout || 120000,
    maxBuffer: options.maxBuffer || 20 * 1024 * 1024,
  });
  if (result.error) {
    throw new Error(`${command} 执行失败: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`${command} 返回非 0 状态: ${result.status}\n${result.stderr || result.stdout}`);
  }
  const output = (result.stdout || "").trim();
  if (!output && options.allowEmpty !== true) {
    throw new Error(`${command} 返回空输出`);
  }
  return output;
}

function hasMcporterServer(name) {
  if (!commandExists("mcporter")) {
    return false;
  }
  try {
    const config = JSON.parse(
      runCommand("mcporter", ["config", "get", name, "--json"], { timeout: 10000 }),
    );
    return Boolean(config && typeof config === "object");
  } catch (_error) {
    return false;
  }
}

function getJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const timeout = Number(options.timeout || 20000);
    const maxBytes = Number(options.maxBytes || 5 * 1024 * 1024);
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          Referer: "https://www.bilibili.com/",
        },
      },
      (res) => {
        const chunks = [];
        let size = 0;
        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          res.resume();
          reject(new Error(`HTTP 状态异常: ${res.statusCode || "unknown"}`));
          return;
        }
        res.on("data", (chunk) => {
          size += chunk.length;
          if (size > maxBytes) {
            req.destroy(new Error(`响应超过 ${maxBytes} 字节限制`));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
          } catch (error) {
            reject(new Error(`JSON 解析失败: ${error.message}`));
          }
        });
      },
    );
    req.on("error", reject);
    req.setTimeout(timeout, () => req.destroy(new Error(`请求超时: ${timeout}ms`)));
  });
}

function validateBilibiliResponse(data, operation) {
  if (!data || typeof data !== "object") {
    throw new Error(`B站${operation}返回结构无效`);
  }
  if (data.code !== 0) {
    throw new Error(
      `B站${operation}业务失败: code=${data.code}, message=${data.message || data.msg || "unknown"}`,
    );
  }
  return data;
}

function extractXhsNoteId(url) {
  const match = String(url).match(/explore\/([A-Za-z0-9]+)/);
  return match ? match[1] : url;
}

function extractXhsUserId(url) {
  const match = String(url).match(/profile\/([A-Za-z0-9]+)/);
  return match ? match[1] : url;
}

function extractBvid(input) {
  const match = String(input).match(/BV[A-Za-z0-9]+/);
  return match ? match[0] : input;
}

function extractBiliMid(input) {
  const match = String(input).match(/space\.bilibili\.com\/(\d+)/);
  return match ? match[1] : input;
}

function platformError(platform, failures = []) {
  if (platform === "xiaohongshu") {
    const attempted = failures.length ? ` 已尝试：${failures.join("；")}` : "";
    return new Error(
      `未发现可完成该操作的小红书后端。可配置 xiaohongshu MCP、OpenCLI，或设置 GUAIKEI_API_TOKEN。${attempted}`,
    );
  }
  if (platform === "douyin") {
    return new Error(
      "当前只支持 DOUYIN_COMMAND 提供的只读能力；未配置时不能执行关键词搜索、详情或账号作品查询。",
    );
  }
  return new Error(`暂不支持平台: ${platform}`);
}

function runCustomDouyin(action, value, options = {}) {
  const command = (process.env.DOUYIN_COMMAND || "").trim();
  if (!command) {
    throw platformError("douyin");
  }
  const args = [action, value];
  if (options.limit) {
    args.push("--limit", String(options.limit));
  }
  return { backend: "custom-douyin-command", raw: runCommand(command, args) };
}

async function searchXiaohongshu(keyword, options = {}) {
  const failures = [];
  if (commandExists("opencli")) {
    try {
      return {
        backend: "opencli xiaohongshu",
        raw: runCommand("opencli", ["xiaohongshu", "search", keyword, "-f", "yaml"]),
      };
    } catch (error) {
      failures.push(`OpenCLI: ${error.message}`);
    }
  }
  if (hasMcporterServer("xiaohongshu")) {
    try {
      return {
        backend: "xiaohongshu-mcp",
        raw: runCommand("mcporter", [
          "call",
          "xiaohongshu.search_feeds",
          `keyword=${keyword}`,
          "--timeout",
          "120000",
        ]),
      };
    } catch (error) {
      failures.push(`xiaohongshu-mcp: ${error.message}`);
    }
  }
  if (commandExists("xhs")) {
    try {
      return { backend: "xhs-cli", raw: runCommand("xhs", ["search", keyword]) };
    } catch (error) {
      failures.push(`xhs-cli: ${error.message}`);
    }
  }
  try {
    return await guaikei.search(keyword, options);
  } catch (error) {
    failures.push(`Guaikei: ${error.message}`);
    throw platformError("xiaohongshu", failures);
  }
}

async function detailXiaohongshu(url, options = {}) {
  const failures = [];
  if (commandExists("opencli")) {
    try {
      const chunks = [runCommand("opencli", ["xiaohongshu", "note", url, "-f", "yaml"])];
      if (options.limit > 0) {
        chunks.push(
          runCommand("opencli", ["xiaohongshu", "comments", extractXhsNoteId(url), "-f", "yaml"]),
        );
      }
      return { backend: "opencli xiaohongshu", raw: chunks.join("\n\n--- comments ---\n\n") };
    } catch (error) {
      failures.push(`OpenCLI: ${error.message}`);
    }
  }
  if (hasMcporterServer("xiaohongshu")) {
    try {
      const noteId = extractXhsNoteId(url);
      const tokenMatch = String(url).match(/[?&]xsec_token=([^&]+)/);
      if (!tokenMatch) {
        throw new Error("读取详情需要包含 xsec_token 的完整笔记 URL");
      }
      return {
        backend: "xiaohongshu-mcp",
        raw: runCommand("mcporter", [
          "call",
          "xiaohongshu.get_feed_detail",
          `feed_id=${noteId}`,
          `xsec_token=${tokenMatch[1]}`,
          "--timeout",
          "120000",
        ]),
      };
    } catch (error) {
      failures.push(`xiaohongshu-mcp: ${error.message}`);
    }
  }
  if (commandExists("xhs")) {
    try {
      return { backend: "xhs-cli", raw: runCommand("xhs", ["read", url]) };
    } catch (error) {
      failures.push(`xhs-cli: ${error.message}`);
    }
  }
  try {
    return await guaikei.detail(url, options);
  } catch (error) {
    failures.push(`Guaikei: ${error.message}`);
    throw platformError("xiaohongshu", failures);
  }
}

async function userXiaohongshu(url, options = {}) {
  const failures = [];
  if (commandExists("opencli")) {
    try {
      return {
        backend: "opencli xiaohongshu",
        raw: runCommand("opencli", ["xiaohongshu", "user", extractXhsUserId(url), "-f", "yaml"]),
      };
    } catch (error) {
      failures.push(`OpenCLI: ${error.message}`);
    }
  }
  try {
    return await guaikei.user(url, options);
  } catch (error) {
    failures.push(`Guaikei: ${error.message}`);
    throw platformError("xiaohongshu", failures);
  }
}

async function searchBilibili(keyword, options = {}) {
  const limit = String(Math.min(Number(options.limit || 20), 50));
  const failures = [];
  if (commandExists("bili")) {
    try {
      return { backend: "bili-cli", raw: runCommand("bili", ["search", keyword, "--type", "video", "-n", limit]) };
    } catch (error) {
      failures.push(`bili-cli: ${error.message}`);
    }
  }
  if (commandExists("opencli")) {
    try {
      return {
        backend: "opencli bilibili",
        raw: runCommand("opencli", ["bilibili", "search", keyword, "-f", "yaml"]),
      };
    } catch (error) {
      failures.push(`OpenCLI: ${error.message}`);
    }
  }
  try {
    const url =
      "https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword=" +
      encodeURIComponent(keyword) +
      "&page=1";
    const data = validateBilibiliResponse(await getJson(url), "搜索");
    if (!data.data || !Array.isArray(data.data.result)) {
      throw new Error("B站搜索返回结构无效: 缺少 data.result 数组");
    }
    data.data.result = data.data.result.slice(0, Number(limit));
    return { backend: "bilibili-public-api", raw: JSON.stringify(data, null, 2) };
  } catch (error) {
    failures.push(`public-api: ${error.message}`);
    throw new Error(`B站搜索全部后端失败：${failures.join("；")}`);
  }
}

async function detailBilibili(input) {
  const bvid = extractBvid(input);
  if (!/^BV[A-Za-z0-9]+$/.test(String(bvid))) {
    throw new Error("B站详情需要有效 BV 号或包含 BV 号的链接");
  }
  const failures = [];
  if (commandExists("bili")) {
    try {
      return { backend: "bili-cli", raw: runCommand("bili", ["video", bvid]) };
    } catch (error) {
      failures.push(`bili-cli: ${error.message}`);
    }
  }
  if (commandExists("opencli")) {
    try {
      return {
        backend: "opencli bilibili",
        raw: runCommand("opencli", ["bilibili", "video", bvid, "-f", "yaml"]),
      };
    } catch (error) {
      failures.push(`OpenCLI: ${error.message}`);
    }
  }
  try {
    const data = validateBilibiliResponse(
      await getJson("https://api.bilibili.com/x/web-interface/view?bvid=" + encodeURIComponent(bvid)),
      "详情",
    );
    if (
      !data.data ||
      typeof data.data !== "object" ||
      typeof data.data.bvid !== "string" ||
      !data.data.bvid ||
      typeof data.data.title !== "string" ||
      !data.data.title ||
      !data.data.owner ||
      data.data.owner.mid === undefined
    ) {
      throw new Error("B站详情返回结构无效: 缺少 bvid、title 或 owner.mid");
    }
    return { backend: "bilibili-public-api", raw: JSON.stringify(data, null, 2) };
  } catch (error) {
    failures.push(`public-api: ${error.message}`);
    throw new Error(`B站详情全部后端失败：${failures.join("；")}`);
  }
}

async function userBilibili(input, options = {}) {
  const mid = extractBiliMid(input);
  if (!/^\d+$/.test(String(mid))) {
    throw new Error("B站主页必须包含纯数字用户 ID");
  }
  const limit = Math.min(Number(options.limit || 20), 100);
  const failures = [];
  if (commandExists("bili")) {
    try {
      return { backend: "bili-cli", raw: runCommand("bili", ["user", mid]) };
    } catch (error) {
      failures.push(`bili-cli: ${error.message}`);
    }
  }
  if (commandExists("yt-dlp")) {
    try {
      return {
        backend: "yt-dlp BilibiliSpaceVideo",
        raw: runCommand("yt-dlp", [
          "--no-update",
          "--simulate",
          "--flat-playlist",
          "--playlist-end",
          String(limit),
          "--dump-single-json",
          `https://space.bilibili.com/${mid}/video`,
        ]),
      };
    } catch (error) {
      failures.push(`yt-dlp: ${error.message}`);
    }
  }
  throw new Error(`B站用户作品后端不可用：${failures.join("；") || "缺少 bili-cli 或 yt-dlp"}`);
}

async function search(platform, keyword, options = {}) {
  if (platform === "xiaohongshu") return searchXiaohongshu(keyword, options);
  if (platform === "bilibili") return searchBilibili(keyword, options);
  if (platform === "douyin") return runCustomDouyin("search", keyword, options);
  throw platformError(platform);
}

async function detail(platform, url, options = {}) {
  if (platform === "xiaohongshu") return detailXiaohongshu(url, options);
  if (platform === "bilibili") return detailBilibili(url, options);
  if (platform === "douyin") return runCustomDouyin("detail", url, options);
  throw platformError(platform);
}

async function user(platform, url, options = {}) {
  if (platform === "xiaohongshu") return userXiaohongshu(url, options);
  if (platform === "bilibili") return userBilibili(url, options);
  if (platform === "douyin") return runCustomDouyin("user", url, options);
  throw platformError(platform);
}

module.exports = {
  search,
  detail,
  user,
  _test: { validateBilibiliResponse },
};
