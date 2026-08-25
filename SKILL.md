---
name: huahai-creator-buddy
description: 花海创作者工具箱总路由。根据用户的平台、目标、输入证据和所需产物，选择公众号或小红书的搜索、分析、定位、写作、标题、排版和复盘 Skill，并在跨步骤流程中保留来源、时间窗、缺失字段和验证状态。适用于“帮我做公众号/小红书”“搜索并分析后继续写”“不知道该用哪个 Skill”等请求。
license: MIT
metadata:
  type: orchestrator
  runtime: agent-skills
  version: "2.0.0"
  routes:
    - huahai-gzh-Skills/huahai-baokuan-article-analysis
    - huahai-gzh-Skills/huahai-baokuan-title-generator
    - huahai-gzh-Skills/huahai-global-content-search
    - huahai-gzh-Skills/huahai-gzh-explosive-content-detector
    - huahai-gzh-Skills/huahai-space-wechat-layout
    - huahai-gzh-Skills/huahai-xhs-hotnotes
    - huahai-xhs-Skills/huahai-space-xhs-account-audit
    - huahai-xhs-Skills/huahai-space-xhs-buddy
    - huahai-xhs-Skills/huahai-space-xhs-hotspot
    - huahai-xhs-Skills/huahai-space-xhs-note-analytics
    - huahai-xhs-Skills/huahai-space-xhs-positioning
    - huahai-xhs-Skills/huahai-space-xhs-title
    - huahai-xhs-Skills/huahai-space-xhs-writer
---

# Huahai Creator Buddy

本文件只做总路由。执行前读取目标子 Skill 的 `SKILL.md`，以子 Skill 当前能力和脚本合同为准，不在总控里复制易过期的命令。

## 1. 解析请求

先提取：

| 字段 | 内容 |
| --- | --- |
| platform | 公众号 / 小红书 / B站 / 抖音 / 跨平台 |
| object | 关键词、链接、账号、文章、草稿、截图或数据文件 |
| task | 搜索、分析、定位、写作、标题、排版或复盘 |
| evidence | 用户素材、公开后端、本地文件及时间窗 |
| output | 表格、JSON、正文、HTML 或实验计划 |

已有信息足够就直接执行。只有歧义会改变路线或用户授权边界时，才补问一个最小问题。

## 2. 路由

### 公众号与跨平台

| 任务 | 子 Skill |
| --- | --- |
| 多关键词公众号赛道聚合 | `huahai-baokuan-article-analysis` |
| 单关键词公众号高传播内容 | `huahai-gzh-explosive-content-detector` |
| 公众号标题 | `huahai-baokuan-title-generator` |
| Markdown 转公众号 HTML | `huahai-space-wechat-layout` |
| 小红书近期热门数据 | `huahai-xhs-hotnotes` |
| 小红书/B站/抖音关键词、详情、账号作品 | `huahai-global-content-search` |

### 小红书生产与复盘

| 任务 | 子 Skill |
| --- | --- |
| 多环节工作流 | `huahai-space-xhs-buddy` |
| 从零定位或重新定位 | `huahai-space-xhs-positioning` |
| 近期热点与候选选题 | `huahai-space-xhs-hotspot` |
| 正文 | `huahai-space-xhs-writer` |
| 标题 | `huahai-space-xhs-title` |
| 主页/多篇账号审计 | `huahai-space-xhs-account-audit` |
| 用户后台单篇或多篇数据复盘 | `huahai-space-xhs-note-analytics` |

用户只要一个单点任务时直接走对应 Skill，不强制经过总控或跑完整链路。

## 3. 能力确认

后端能力必须按目标操作分别验证：

- `REDFOX_API_KEY` 只代表 Redfox 路径可能配置，不代表请求一定成功；
- 小红书账号作品不是“任意 Key”都可用，以 global search 当前能力矩阵为准；
- B站搜索/详情可用公开 API，账号作品另需对应后端；
- 抖音只在用户显式配置 `DOUYIN_COMMAND` 时可用；
- 本地 CSV/Excel、标题、正文和定位不依赖平台后端；
- 公众号 HTML 有固定本地渲染器，但公众号编辑器实贴必须单独验证。

成功状态至少包含：退出码正确、机器输出可解析、`status` 与后端明确、结果非空或明确的真实空集、查询参数与用户输入一致。

## 4. 跨步骤数据包

```yaml
goal: 用户真正要完成的结果
inputs:
  facts: []
  missing: []
  sources: []
data_status:
  state: verified-live|verified-fixture|partial|empty|unavailable|structural-only|untested
  backend: null
  retrieved_at: null
  time_window: null
  sample_size: null
  caveats: []
output_status: success|partial|empty|error|needs_confirmation|scaffold
next_step:
  skill: huahai-...
  reason: 选择理由
```

跨步骤必须保留原始链接、字段、时间窗、样本量、推广状态、事实台账和缺口。需要 `xsec_token` 的搜索结果 URL 只在当前本地只读链路中原样传递；公开报告、日志、README 和对外消息必须脱敏。搜索结果中的推断不能在写作步骤自动变成第一人称经历。

## 5. 推荐工作流

### 研究到成稿

```text
verified search → 事实/推断分区 → 用户选择角度
                → writer → title → 用户发布
```

没有真实搜索结果时，可以基于用户素材写，但必须把数据状态标为 unavailable，不能编造“近期趋势”。

### 定位到验证

```text
positioning → 5–10 篇单变量计划 → 用户发布
            → note analytics → positioning 校准
```

热点只是外部样本，不证明用户账号适配。

### 公众号文章

```text
原始文章 → 标题事实核验 → title → layout → 本地验证
                                         → 公众号实贴验证（单独状态）
```

## 6. 输出状态

每次交付先说结果，再说明证据等级：

- `verified-live`：当前真实请求已通过目标合同；
- `verified-fixture`：确定性 fixture 已通过输入、错误与空集合同；
- `partial`：部分后端/字段通过，其余缺失；
- `empty`：查询成功但真实返回空集；
- `unavailable`：缺后端、凭证或权限；
- `structural-only`：只验证语法、文件、构建或 HTML 结构；
- `untested`：尚未执行。

不得把 structural-only 说成线上、浏览器、公众号实贴、真实账号或发布效果已验证。

## 7. 诚实与安全

- 只读公开数据和用户主动提供的数据。
- 不发布、点赞、评论、关注、私信、刷量、养号或绕过风控。
- Key、Cookie 和登录态永不回显、记录或提交；带 `xsec_token` 的原始结果 URL 仅限当前本地只读步骤传递，不进入公开报告、日志或版本库。
- 不用无关结果补满空集，不把模糊数恢复成精确数。
- 不把热点、评分、标题模式或单篇表现写成因果和增长保证。
- 不虚构身份、经历、数字、产品效果、引用和平台规则。
- 不调用仓库中不存在的 Skill。

行为回归见根目录 `test-prompts.json`；每个子 Skill 还有自己的回归提示集。
