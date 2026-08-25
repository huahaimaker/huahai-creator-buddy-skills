---
name: huahai-space-xhs-buddy
description: 小红书工作流路由器。根据用户手上的素材、账号阶段和目标，选择定位、热点、正文、标题、账号审计或单篇数据复盘，并在跨步骤任务中传递事实台账和数据状态。适用于“从头做小红书”“帮我运营”“把选题写成笔记并复盘”等多环节请求；单一任务直接使用对应专项 Skill。
metadata:
  dependencies: []
---

# 小红书工作流路由器

只负责选路径、确认能力和传递上下文，不替专项 Skill 重复发明规则。

## 1. 先识别当前输入

最多补问两个影响路径的问题：

1. 你现在有：定位 / 选题 / 原始素材 / 已发布数据 / 主页证据中的哪些？
2. 这次要得到：定位方案 / 一篇稿 / 标题 / 原因诊断 / 下一轮实验中的哪个？

用户已经给足信息就直接路由，不为走流程而追问。

## 2. 路由表

| 输入与目标 | 路由 | 交接物 |
| --- | --- | --- |
| 从零，不知道为谁写什么 | `huahai-space-xhs-positioning` | 真实资产、产能、目标 |
| 定位已有，想验证近期样本 | `huahai-space-xhs-hotspot` | 赛道词、时间窗、数据状态 |
| 有主题或真实素材，要正文 | `huahai-space-xhs-writer` | 原始素材、事实台账 |
| 有正文，要标题 | `huahai-space-xhs-title` | 正文、事实台账、长度口径 |
| 单篇已发布，问为什么 | `huahai-space-xhs-note-analytics` | 原始导出、字段和时间窗 |
| 主页或整个账号不涨 | `huahai-space-xhs-account-audit` | 截图/作品列表、目标和窗口 |
| 竞品主页对标 | `huahai-space-xhs-account-audit` | 同口径证据和不可迁移项 |

不要因为用户只问标题就自动推翻其定位。只有现有证据表明问题在更上游，才说明理由并建议另一路径。

## 3. 实际能力矩阵

先判断任务需要哪项能力，再检查那个能力本身；不能用“存在任意 Key”代替能力验证。

| 专项 | 无外部后端 | 结构化后端 | 成功判据 |
| --- | --- | --- | --- |
| positioning | 用户访谈可用 | 可选用已验证热点样本 | 假设、事实和实验计划分开 |
| writer | 素材足够时可用 | 不需要 | 交付状态 + fact refs |
| title | 正文/素材足够时可用 | 不需要 | 每条标题 claim 可回指事实 |
| note analytics | 本地 CSV/JSON 可用 | 不需要远端 | 字段口径、有效样本量、状态明确 |
| hotspot | 本地输入可比较 | Redfox Key 才能跑当前实时抓取 | `status`、来源、时间、非空结果 |
| account audit | 截图路径可用 | 小红书账号作品仅在 OpenCLI/Guaikei 对应能力可用时执行 | 证据矩阵，缺失维度 N/A |

需要结构化平台数据时，先读取同仓库 `huahai-global-content-search` 的当前能力矩阵。环境变量存在只说明“可能配置”，不说明调用、权限、业务码和返回字段有效。

## 4. 标准链路

### 从零验证定位

```text
positioning → 用户确认最小假设 → 5–10 篇单变量实验
            → note analytics → positioning 校准
```

热点数据只提供候选与外部样本，不证明用户本人能做成。

### 生产一篇

```text
真实素材 → writer → title → 用户发布
```

writer 输出的事实台账必须原样交给 title。若 writer 状态为 `needs_confirmation` 或 `scaffold`，title 不得把占位内容包装成事实。

### 诊断改进

```text
单篇原始数据 → note analytics → 一条归因假设 → 下一篇单变量测试
主页/多篇证据 → account audit → 上游问题 → 对应专项
```

曝光、点击、阅读、互动和关注必须按实际字段解释。没有 CTR 就不能判定“标题导致点击低”；没有主页访问到关注数据就不能判定转化率。

## 5. 跨步骤数据包

每次交接使用：

```yaml
goal: 本次用户目标
inputs:
  facts: [F1, F2]
  missing: []
  sources: []
data_status:
  state: verified|partial|unavailable
  backend: null
  retrieved_at: null
  time_window: null
  caveats: []
output_status: publishable|needs_confirmation|scaffold|analysis_only
next_step:
  skill: huahai-...
  reason: 为什么
```

不要在步骤间丢掉原始字段、时间窗、缺口、推广状态和主观/客观边界。

## 6. 执行规则

- 用户要求“一次做完”且素材完整时可以连续执行；只有结论会改变后续方向时才暂停确认。
- 外部后端失败一次并确认不可用后，立即走截图、本地文件或人工补充路径。
- 搜索返回空结果就是空结果，不用无关样本填满。
- 竞品方法可拆，身份、资源、投放、团队和时间红利单列为不可迁移。
- 不自动发布、不刷量、不绕风控、不批量虚构账号内容。
- 高风险主张不通过“换词”规避，而是回到证据或删除。

## 7. 输出

路由时只给用户当前需要的四件事：

1. 当前判断；
2. 选择哪个 Skill，为什么；
3. 已有输入和还缺的最小信息；
4. 下一步完成判据。

跨步骤完成后，汇总每步的输入状态、输出状态和下一轮验证指标。不要把“生成完成”说成“效果已验证”。

行为回归见 `test-prompts.json`。
