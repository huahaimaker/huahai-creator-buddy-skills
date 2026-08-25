# Validation Report

审计日期：2026-08-25｜分支：`auto-optimize/20260825-darwin`

本报告区分确定性 fixture、真实联网、本地浏览器和未验证项。远端平台与第三方后端会变化，安装后应重新运行 smoke test。

## 仓库级验证

命令：

```bash
python3 scripts/validate_repository.py
```

当前结果：

| 项目 | 结果 |
| --- | ---: |
| Skill | 14 |
| `test-prompts.json` | 14 |
| Python 文件 | 11 |
| JavaScript 文件 | 18 |
| 确定性检查 | 156 |
| 失败 | 0 |

覆盖：frontmatter、`huahai-` 前缀、唯一 Skill 名、测试集 JSON、全部 JSON、Python 编译、JavaScript `node --check`、13 条根路由、旧/删除模块残留，以及全局搜索、笔记复盘、热点数据和公众号 HTML 的运行合同。

Skills CLI 发现测试：

```bash
npx skills add . --list --full-depth
```

结果：`Found 14 skills`。随后在独立临时目录使用 `--full-depth --skill '*' -y --copy --agent codex` 实际安装最终修订版，CLI 报告 `Installed 14 skills`，磁盘复核得到 14 份独立 `SKILL.md`。从安装后的副本再次运行全局搜索 12 项、笔记复盘 6 项、热点数据 6 项和公众号排版 7 项合同测试，全部通过。不加 `--full-depth` 时只发现根 `huahai-creator-buddy`，因此 README 的整套安装命令已显式包含该参数。

注意：`test-prompts.json` 是行为回归用例集。仓库验证器检查其结构，不等于已经用某个具体模型完整执行了每条自然语言用例。

## 真实联网验证

### B站全局搜索

入口：`huahai-global-content-search`

| 操作 | 当前结果 | 后端 | 备注 |
| --- | --- | --- | --- |
| 关键词搜索 `AI 编程` | `verified-live` | `bilibili-public-api` | 最终修订后复测：退出 0，JSON success，返回 3 条 |
| 视频详情 `BV1X8oKBLEdj` | `verified-live` | `bilibili-public-api` | 最终修订后复测：业务码 0，`bvid/title/owner.mid` 完整 |
| UP 主 `38061207` 作品 | `verified-live` | `yt-dlp BilibiliSpaceVideo` | 首次被服务端 412 拦截并正确退出 1；单次重试成功 |

确定性 CLI 合同共 12 组：缺参数、负数 limit、未知参数、额外位置参数、空/成功后端、stdout JSON、退出码、目标 stderr 脱敏和落盘日志脱敏。脱敏 fixture 覆盖普通/多重编码参数名、畸形百分号并存、YAML、shell、数组及嵌套 raw JSON，并真实写入临时文件确认 secret 不落盘。

### 公众号数据

| Skill | 当前结果 | 已验证内容 |
| --- | --- | --- |
| `huahai-gzh-explosive-content-detector` | `verified-live + fixture` | TLS、schema、相关性过滤、真实空集、失败状态和数据量报告 |
| `huahai-baokuan-article-analysis` | `verified-live + fixture` | OpenAI 查询返回 5 条；TLS、schema、相关性、partial/empty/error 和相对排序 |

远端返回内容会随查询时间变化。这里验证的是数据合同和失败处理，不承诺固定条数。

## 本地数据与渲染验证

### 小红书笔记复盘

入口：`huahai-space-xhs-note-analytics/scripts/xhs_notes.py`

确定性 fixture 已覆盖：

- 明确 CTR 与计算 CTR 冲突；
- 阅读大于曝光、负数和越界比率不进入统计；
- 混合时间窗清空不可比比率；
- `点赞率`/`like_percentage` 不误映射成点赞绝对量；
- `0.05` 与 `5` 混用时整列拒绝，`0/5/6` 则按百分数正确处理；
- 指标级有效样本量，而不是组总行数；
- 有效 n 小于 3 时只报告样本，不做优劣判断。

状态：`verified-fixture`。没有连接小红书账号后台；只处理用户导出的本地数据。

### 小红书热点

入口：`huahai-space-xhs-hotspot`

确定性 fixture 已覆盖：精确互动值、模糊值、严格非负整数、原始链接、恶意相似域名、空白/缺失 `xsec_token`、公开 HTML 脱敏、缺评分 `null`、写失败单 JSON、global-search envelope、无 Key 错误和比较集有效样本量。

状态：`verified-fixture`。当前环境没有 `REDFOX_API_KEY`，因此本次未做该 Skill 的 Redfox 真实联网请求。

### 公众号 HTML

入口：`huahai-space-wechat-layout/scripts/render_wechat_layout.py`

| 层级 | 结果 |
| --- | --- |
| 渲染器回归 | 7 个确定性用例通过 |
| 本次真实产物 | openai 风格、35 个区块、frontmatter 已移除 |
| 文章 SHA-256 | `9f13262e8c9087835670fb8fe0d52bd01523aab9f8a64e3c9d307181619be213` |
| 本地 HTTP | 200，响应 22762 bytes |
| Chrome 桌面截图 | 代表性输出已人工检查：标题、层级、列表、代码和表格可读 |
| 公众号编辑器实贴 | `untested` |

本地 HTML、浏览器截图和 HTTP 2xx 不等于微信公众号编辑器保存后的保真。只有实际粘贴、保存和预览后才能升级为实贴通过。

## 指令型 Skill

以下 Skill 主要是 Agent 指令，不以独立网络脚本作为核心：

- `huahai-space-xhs-account-audit`
- `huahai-space-xhs-title`
- `huahai-space-xhs-writer`
- `huahai-space-xhs-buddy`
- `huahai-space-xhs-positioning`
- `huahai-baokuan-title-generator`
- 根 `huahai-creator-buddy`

它们已通过 frontmatter、路由、测试集结构、死引用和 Darwin A/B 配对审计。三名独立审计员对基线 `eae77fe` 与优化版的 10 个剩余 Skill 均选择保留优化版；审计指出的比率、域名、计数、frontmatter、状态枚举和 token 旁路随后补了代码回归并复审。状态明确区分 `verified-live`、`verified-local`、`verified-fixture` 和 `structural-only`。自然语言输出仍依赖所用模型、用户素材和实际平台环境；事实台账与缺失状态是交付前的强制检查点。

## 尚未声称通过

- 小红书 Redfox 真实联网：当前缺 Key；
- 小红书 OpenCLI/MCP/Guaikei 每个操作的当前线上可用性：未全量验证；
- 抖音：没有内置后端，需用户配置 `DOUYIN_COMMAND`；
- 微信公众号编辑器实贴、保存和手机预览；
- 任何真实发布后的点击、互动、涨粉或商业结果；
- 不同 Agent Runtime 的全量安装兼容性。

## 重跑原则

1. 先运行仓库验证器；
2. 按实际平台只测试需要的操作；
3. 真实请求记录查询词、时间、后端、退出码和业务状态；
4. 远端失败不回退成假数据；
5. 只把本次真正通过的层级写进交付。
