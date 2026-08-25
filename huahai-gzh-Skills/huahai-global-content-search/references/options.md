# 全域内容搜索选项说明

## 1. 跨平台关键词搜索

```bash
node src/xiaohongshu/search-cli.js <关键词> [选项]
```

| 选项 | 说明 |
| --- | --- |
| `--platform -p` | 平台：`xiaohongshu` / `bilibili` / `douyin`，默认 `xiaohongshu` |
| `--keyword -k` | 搜索关键词 |
| `--limit -l` | 搜索数量，默认 20 |
| `--output -o` | 输出格式：`json` / `raw`，默认 `json` |
| `--type -t` | 兼容旧参数，部分平台忽略 |
| `--sort -s` | 兼容旧参数，部分平台忽略 |
| `--time -i` | 兼容旧参数，部分平台忽略 |

示例：

```bash
node src/xiaohongshu/search-cli.js --platform xiaohongshu --keyword "露营装备" --limit 20
node src/xiaohongshu/search-cli.js --platform bilibili --keyword "AI编程" --limit 10
node src/xiaohongshu/search-cli.js --platform douyin --keyword "AI工具"
```

## 2. 详情与评论

```bash
node src/xiaohongshu/detail-cli.js <链接或ID> [选项]
```

| 选项 | 说明 |
| --- | --- |
| `--platform -p` | 平台：`xiaohongshu` / `bilibili` / `douyin`，默认 `xiaohongshu` |
| `--url -u` | 笔记/视频链接或 ID |
| `--limit -l` | 评论数量，部分后端支持，默认 0 |
| `--output -o` | 输出格式：`json` / `raw`，默认 `json` |

示例：

```bash
node src/xiaohongshu/detail-cli.js \
  --platform xiaohongshu \
  --url "https://www.xiaohongshu.com/explore/xxx?xsec_token=yyy" \
  --limit 100

node src/xiaohongshu/detail-cli.js --platform bilibili --url "BVxxxx"
```

## 3. 创作者作品

```bash
node src/xiaohongshu/post-cli.js <主页链接或ID> [选项]
```

| 选项 | 说明 |
| --- | --- |
| `--platform -p` | 平台：`xiaohongshu` / `bilibili` / `douyin`，默认 `xiaohongshu` |
| `--url -u` | 创作者主页链接或 ID |
| `--limit -l` | 作品数量，默认 20 |
| `--output -o` | 输出格式：`json` / `raw`，默认 `json` |

示例：

```bash
node src/xiaohongshu/post-cli.js \
  --platform xiaohongshu \
  --url "https://www.xiaohongshu.com/user/profile/xxx?xsec_token=yyy" \
  --limit 20

node src/xiaohongshu/post-cli.js \
  --platform bilibili \
  --url "https://space.bilibili.com/123456" \
  --limit 20
```

## 4. 后端说明

### 小红书

直接探测并依次尝试可用后端，不解析 `agent-reach doctor` 的人类输出：

- `OpenCLI`：`opencli xiaohongshu ...`
- `xiaohongshu-mcp`：`mcporter call 'xiaohongshu....'`
- `xhs-cli`：`xhs ...`
- 兜底：如果以上后端不可用，且配置了 `GUAIKEI_API_TOKEN`，自动使用 Guaikei API。

```bash
export GUAIKEI_API_TOKEN="your_api_token_here"
```

Guaikei API 兜底支持小红书关键词搜索、笔记详情/评论、博主作品。

### B站

优先级：

关键词搜索与详情优先级：

1. `bili-cli`
2. `opencli bilibili`
3. B站公开搜索/详情 API

账号作品优先级：

1. `bili-cli`
2. `yt-dlp` 的 `BilibiliSpaceVideo` extractor

B站公开 API 必须同时满足 HTTP 2xx、业务 `code === 0` 和所需字段存在，才视为成功。

### 抖音

当前仓库只接入用户提供的只读命令，不把单条链接解析能力冒充搜索能力。可设置：

```bash
export DOUYIN_COMMAND="/path/to/douyin-readonly-cli"
```

自定义 CLI 需支持：

```bash
$DOUYIN_COMMAND search <keyword> --limit <n>
$DOUYIN_COMMAND detail <url-or-id>
$DOUYIN_COMMAND user <user-url-or-id> --limit <n>
```

## 5. 退出码与输出

| 结果 | 退出码 |
| --- | ---: |
| 成功 | 0 |
| 网络、后端、HTTP 或业务错误 | 1 |
| 参数错误 | 2 |

`--output json` 时 stdout 只有一个 JSON 对象，诊断信息写 stderr。运行日志默认不落盘；设置 `HUAHAI_SEARCH_LOG_DIR` 后才写入指定目录。
