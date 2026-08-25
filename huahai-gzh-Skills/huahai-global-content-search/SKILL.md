---
name: huahai-global-content-search
description: 通过统一只读 CLI 搜索小红书、B站和已配置的抖音后端，或读取内容详情与创作者作品。用户要求跨平台内容搜索、笔记/视频详情、评论、博主或 UP 主作品时触发。运行前探测具体能力，后端缺失、业务码失败或响应无效时非零退出，不编造结果。
license: MIT
metadata:
  dependencies:
    node: ">=16.14.0"
  category:
    - Data&APIs
    - 内容创作
---

# 全域内容搜索

三个入口统一参数、退出码和 JSON 输出，但各平台能力并不相同。先看能力矩阵，再执行对应命令。

## 能力矩阵

| 平台 | 关键词搜索 | 内容详情 | 账号作品 | 实际后端 |
| --- | --- | --- | --- | --- |
| 小红书 | 条件可用 | 条件可用 | 条件可用 | OpenCLI、已配置的 `xiaohongshu` MCP、`xhs-cli` 或 Guaikei |
| B站 | 可用 | 可用 | 条件可用 | 公开 API；账号作品另需 `bili` 或 `yt-dlp` |
| 抖音 | 条件可用 | 条件可用 | 条件可用 | 仅用户显式配置的 `DOUYIN_COMMAND` |

“条件可用”不等于自动可用。必须实际运行并以退出码、`status` 和 `backend` 为准；不能因为装了 Agent Reach 或任意一个 Key 就宣称三种能力全部可用。

## 预检

先定位本文件所在目录为 `<skill_dir>`，再检查：

```bash
command -v node
node --version
```

按目标平台追加检查：

```bash
mcporter config get xiaohongshu --json
command -v yt-dlp
test -n "$GUAIKEI_API_TOKEN"
test -n "$DOUYIN_COMMAND"
```

不要使用 `agent-reach doctor --json` 作为机器路由协议；部分已安装版本不支持该参数。脚本会直接探测和执行具体后端。

## 执行

### 搜索

```bash
node <skill_dir>/src/xiaohongshu/search-cli.js \
  --platform bilibili \
  --keyword 'AI 编程' \
  --limit 10 \
  --output json
```

### 内容详情

```bash
node <skill_dir>/src/xiaohongshu/detail-cli.js \
  --platform bilibili \
  --url 'BVxxxxxxxxxx' \
  --output json
```

小红书 MCP 详情必须使用搜索结果返回的完整 URL，并保留 `xsec_token`。

### 账号作品

```bash
node <skill_dir>/src/xiaohongshu/post-cli.js \
  --platform bilibili \
  --url 'https://space.bilibili.com/123456' \
  --limit 20 \
  --output json
```

B站账号作品会优先用 `bili`，否则使用本机 `yt-dlp` 的 `BilibiliSpaceVideo` extractor。

### 抖音自定义只读后端

```bash
export DOUYIN_COMMAND='/absolute/path/to/douyin-readonly-cli'
node <skill_dir>/src/xiaohongshu/search-cli.js --platform douyin --keyword 'AI 工具'
```

该命令必须支持：

```text
<command> search <keyword> --limit <n>
<command> detail <url-or-id>
<command> user <user-url-or-id> --limit <n>
```

仓库不会把单条抖音链接解析能力冒充关键词搜索或账号作品能力。

## 机器输出合同

默认 `--output json`：

- stdout 只有一个 JSON 对象；
- 诊断、Banner 和日志只写 stderr；
- 成功：退出 0，`status: success`，并包含具体 `backend`；
- 参数错误：退出 2，`status: error`；
- 后端、网络、HTTP 或业务错误：退出 1，`status: error`。

`raw` 保留后端原始文本，不能假设不同平台字段同构。需要保存运行日志时显式设置：

```bash
export HUAHAI_SEARCH_LOG_DIR='/absolute/writable/log-directory'
```

未设置时不向 Skill 安装目录写文件。

## 验证数据流

成功交付前检查：

1. 退出码为 0；
2. stdout 可直接被 JSON 解析；
3. `status` 为 `success`；
4. `backend` 与目标平台、操作一致；
5. `raw` 非空，且后端自己的 HTTP 状态与业务码成功；
6. 查询词、URL/ID、limit 与用户输入一致。

只验证到命令存在、语法通过或 extractor 可识别时，标记“结构可用”；只有真实请求返回成功数据后才标记“线上已验证”。

## 失败处理

| 条件 | 处理 |
| --- | --- |
| 小红书所有后端缺失 | 退出 1，列出已尝试后端；不生成假结果 |
| 小红书详情缺 `xsec_token` 且当前后端需要 | 停止，让用户提供完整搜索结果 URL |
| B站 HTTP 非 2xx、`code != 0` 或字段缺失 | 退出 1，不把错误页包装成成功 |
| 抖音未配置 `DOUYIN_COMMAND` | 退出 1，明确当前操作不可用 |
| 子进程退出非 0 | 传播为顶层退出 1，并保留错误摘要 |
| 参数、平台、limit 或 output 无效 | 退出 2，不静默改成默认值 |

## 反例黑名单

- 不把 `agent-reach doctor` 的人类文本当稳定机器协议。
- 不把 stdout 的 Banner 与 JSON 混在一起。
- 不因 HTTP 200 就忽略平台业务错误码。
- 不把后端缺失、子进程失败或参数错误返回成退出 0。
- 不声称抖音后端已内置，也不把单条解析扩写成搜索能力。
- 不将小红书、B站和抖音的原始字段直接混算排行榜。

更多参数见 `references/options.md`，行为回归见 `test-prompts.json`。
