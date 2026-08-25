const fs = require("fs");
const path = require("path");
const utils = require("./utils");

function redactSensitive(value) {
  return String(value)
    .replace(/("xsec_token"\s*:\s*")[^"]*(")/gi, "$1[REDACTED]$2")
    .replace(/((?:[?&]|\b)xsec_token=)[^&#\s"'\\]*/gi, "$1[REDACTED]")
    .replace(/(xsec_token%3D)[^%&\s"'\\]*/gi, "$1[REDACTED]");
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
