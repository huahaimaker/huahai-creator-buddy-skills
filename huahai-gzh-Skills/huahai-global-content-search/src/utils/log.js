const fs = require("fs");
const path = require("path");
const utils = require("./utils");

async function taskWrite(filename, content) {
  const configuredDir = (process.env.HUAHAI_SEARCH_LOG_DIR || "").trim();
  if (!configuredDir) {
    return null;
  }
  const safeFilename = filename.replace(/[\\/:*?"<>|]/g, "_");
  const outputFilename = path.join(path.resolve(configuredDir), safeFilename);

  try {
    await fs.promises.mkdir(path.dirname(outputFilename), { recursive: true });
    await fs.promises.writeFile(outputFilename, content);
    utils.printSuccess(`  → 已保存到 ${outputFilename}`);
    return outputFilename;
  } catch (error) {
    utils.printError(`日志写入失败: ${error.message}`);
    return null;
  }
}

module.exports = {
  taskWrite,
};
