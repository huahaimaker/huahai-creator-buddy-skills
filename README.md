# Huahai Creator Buddy Skills

一套面向公众号与小红书创作者的 Agent Skills：先核验输入和数据能力，再做搜索、分析、定位、写作、标题与复盘。

作者：**花海**｜VX：**SeaMinnie**

仓库：`huahaimaker/huahai-creator-buddy-skills`

当前共 **13 个 Skill**：1 个根路由 + 12 个专项 Skill。视频制作、自动配图、公众号排版和 `huahai-cat-illustrations` 已移除，不在当前仓库能力范围内。

## 这版解决什么

- 数据成功必须有正确退出码、可解析输出、明确后端和非空结果；
- 空结果、缺 Key、业务码错误和后端缺失不会伪装成成功；
- 标题与正文中的数字、身份、价格、经历和效果必须回指用户事实；
- 账号截图看不到的维度记 `N/A`，不拼凑虚假 100 分；
- 小红书定位改为 5–10 篇小样本实验，不承诺固定涨粉结果；
- 所有验证结果区分 fixture、真实联网、真实本地文件和未验证状态。

## 目录

```text
.
├── SKILL.md                         # 根路由
├── test-prompts.json                # 根路由回归集
├── huahai-gzh-Skills/               # 公众号与跨平台：5 个
├── huahai-xhs-Skills/               # 小红书生产与复盘：7 个
└── scripts/validate_repository.py   # 仓库级验证
```

## 公众号与跨平台

| Skill | 用途 | 数据/运行边界 |
| --- | --- | --- |
| `huahai-baokuan-article-analysis` | 多关键词公众号赛道聚合、相对排序 | Redfox；验证 TLS、schema、相关性及 partial/empty/error |
| `huahai-gzh-explosive-content-detector` | 单关键词公众号高传播内容 | Redfox；无关结果过滤，不用零相关兜底 |
| `huahai-global-content-search` | 小红书/B站/抖音搜索、详情、账号作品 | 各操作能力不同，见子 Skill 能力矩阵 |
| `huahai-xhs-hotnotes` | 小红书近期热门笔记 | 需要 `REDFOX_API_KEY`；返回快照，不是平台实时值 |
| `huahai-baokuan-title-generator` | 科技/AI 公众号标题 | 事实和来源台账，不承诺“10 万+” |

## 小红书

| Skill | 用途 | 核心输出 |
| --- | --- | --- |
| `huahai-space-xhs-buddy` | 多步骤总路由 | 能力预检、跨步骤数据包 |
| `huahai-space-xhs-positioning` | 从零定位或重新定位 | 候选定位、外部证据状态、5–10 篇实验 |
| `huahai-space-xhs-hotspot` | 热点样本和选题验证 | 原始链接、精确/模糊指标分离、数据状态 |
| `huahai-space-xhs-writer` | 小红书正文 | 事实台账、publishable/待确认/scaffold 状态 |
| `huahai-space-xhs-title` | 小红书标题 | 标题 claim → fact_refs、长度口径和风险 |
| `huahai-space-xhs-account-audit` | 主页与账号审计 | 证据矩阵、覆盖率、N/A 维度 |
| `huahai-space-xhs-note-analytics` | 后台 CSV/Excel/截图复盘 | 字段口径、有效样本量、中位数和单变量实验 |

## 安装

安装全部 13 个 Skill：

```bash
npx skills add huahaimaker/huahai-creator-buddy-skills \
  --full-depth --skill '*' -y
```

仓库根目录本身也是一个 Skill，因此必须加 `--full-depth` 才会继续发现 12 个嵌套 Skill。只想安装总路由时可以省略它。

安装前只列出可发现项：

```bash
npx skills add huahaimaker/huahai-creator-buddy-skills \
  --list --full-depth
```

或手动克隆：

```bash
git clone https://github.com/huahaimaker/huahai-creator-buddy-skills.git
```

每个子目录都是独立 Skill。只需要某项能力时，可用 `--skill <name>` 指定安装。

## 先验证仓库

```bash
python3 scripts/validate_repository.py
```

验证器会检查：

- 13 个 `SKILL.md` 的 frontmatter、`huahai-` 前缀和唯一名称；
- 13 份 `test-prompts.json` 的结构与唯一用例 id；
- 所有 JSON 可解析；
- 所有 Python 可编译、所有 JavaScript 通过 `node --check`；
- 根路由指向 12 个真实子 Skill；
- 已删除模块和旧 Skill 引用没有残留；
- 全局搜索 CLI、笔记复盘和热点数据的确定性运行回归。

这一步是结构和 fixture 验证，不会调用付费 API，也不代表所有远端后端当前可用。

## 常用入口

### B站搜索

```bash
node huahai-gzh-Skills/huahai-global-content-search/src/xiaohongshu/search-cli.js \
  --platform bilibili \
  --keyword 'AI 编程' \
  --limit 10 \
  --output json
```

成功时 stdout 是单一 JSON、退出 0；参数错误退出 2；网络、后端、HTTP 或业务错误退出 1。

### 公众号赛道分析

```bash
python3 huahai-gzh-Skills/huahai-baokuan-article-analysis/scripts/daily_sector_trends.py \
  --sector 'AI Coding=Codex,Claude Code,AI编程' \
  --days 7 \
  --output-dir ./reports
```

需要对应数据凭证。输出会区分 success、partial、empty 和 error。

### 小红书后台数据复盘

```bash
python3 huahai-xhs-Skills/huahai-space-xhs-note-analytics/scripts/xhs_notes.py \
  probe '/absolute/path/notes.csv'
```

先探查字段和时间窗，再执行 `metrics` 或 `group`。缺失、负数、混合时间窗和冲突比率不会进入统计。

## 凭证与后端

| 配置 | 用途 |
| --- | --- |
| `REDFOX_API_KEY` | Redfox 公众号/小红书数据路径 |
| `GUAIKEI_API_TOKEN` | 部分小红书搜索、详情或账号作品兜底 |
| `DOUYIN_COMMAND` | 用户自行提供的抖音只读 CLI |
| OpenCLI / 小红书 MCP / `xhs-cli` | 条件可用的小红书搜索与详情 |
| `bili` / `yt-dlp` | B站账号作品；搜索和详情另有公开 API |

环境变量存在只代表“可能已配置”。实际成功仍以退出码、`status`、`backend`、业务码和非空结果为准。

不要提交 `.env`、Key、Cookie、登录态或带敏感 token 的链接。小红书搜索结果中的完整 `xsec_token` URL 仅在当前本地只读详情链路中传递；写入公开报告、日志和仓库前必须脱敏。

## 数据可信度

交付中使用以下状态：

| 状态 | 含义 |
| --- | --- |
| `verified-live` | 当前真实请求返回成功数据 |
| `verified-local` | 用户真实本地文件成功解析且口径已检查 |
| `verified-fixture` | 确定性 fixture 通过输入/错误/空集合同 |
| `structural-only` | 仅语法、文件或构建结构通过 |
| `partial` | 部分字段或后端通过 |
| `empty` | 请求成功但真实返回空集 |
| `unavailable` | 缺后端、凭证、权限或网络 |
| `untested` | 尚未执行 |

当前版本的具体审计证据见 [VALIDATION.md](./VALIDATION.md)。远端服务会变化，安装后应重新运行对应 smoke test。

## 使用原则

- 只读公开数据和用户主动提供的数据；
- 不发布、点赞、评论、关注、私信、刷量、养号或绕过风控；
- 不用无关结果补满空集；
- 不把公开互动数当内容质量或账号适配度；
- 不把标题评分、热点样本或小样本相关性写成增长保证；
- 不虚构身份、经历、数据、引用、功效和平台规则。

## 许可证

MIT
