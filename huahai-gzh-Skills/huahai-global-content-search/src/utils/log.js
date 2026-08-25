const fs = require("fs");
const path = require("path");
const utils = require("./utils");

function redactPlainText(value) {
  let text = String(value);
  for (let index = 0; index < 3; index += 1) {
    let decoded;
    try {
      decoded = decodeURIComponent(text);
    } catch (_) {
      break;
    }
    if (decoded === text) break;
    text = decoded;
  }
  return text
    .replace(/("xsec_token"\s*:\s*)\[[^\]\r\n]*\]/gi, '$1["[REDACTED]"]')
    .replace(/("xsec_token"\s*:\s*")[^"]*(")/gi, "$1[REDACTED]$2")
    .replace(/((?:[?&]|\b)xsec_token=)[^&#\s"'\\]*/gi, "$1[REDACTED]")
    .replace(/(xsec_token%3D)[^&\s"'\\]*/gi, "$1[REDACTED]")
    .replace(/(\bxsec_token\b\s*[:=]\s*)(?:\[[^\]\r\n]*\]|"[^"]*"|'[^']*'|[^\r\n,}\]\\]+)/gi, "$1[REDACTED]");
}

function redactNested(value, depth = 0) {
  if (depth > 8) return "[REDACTED:MAX_DEPTH]";
  if (Array.isArray(value)) return value.map((item) => redactNested(item, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      key,
      key.toLowerCase() === "xsec_token" ? "[REDACTED]" : redactNested(item, depth + 1),
    ]));
  }
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.stringify(redactNested(JSON.parse(value), depth + 1));
    } catch (_) {
      // 后端 raw 可能只是近似 JSON；继续走文本脱敏。
    }
  }
  return redactPlainText(value);
}

function redactSensitive(value) {
  const text = String(value);
  try {
    const redacted = redactNested(JSON.parse(text));
    return JSON.stringify(redacted, null, text.includes("\n") ? 2 : 0);
  } catch (_) {
    return redactPlainText(text);
  }
}

async function taskWrite(filename, content) {
  const configuredDir = (process.env.HUAHAI_SEARCH_LOG_DIR || "").trim();
  if (!configuredDir) {
    return null;
  }
  const safeFilename = filename.replace(/[\\/:*?"<>|]/g, "_");
  const outputFilename = path.join(path.resolve(configuredDir), safeFilename);

  try {
    await fs.promises.mkdir(path.dirname(outputFilename), { recursive: true });
    await fs.promises.writeFile(outputFilename, redactSensitive(content));
    utils.printSuccess(`  → 已保存到 ${outputFilename}`);
    return outputFilename;
  } catch (error) {
    utils.printError(`日志写入失败: ${error.message}`);
    return null;
  }
}

module.exports = {
  redactSensitive,
  taskWrite,
};
