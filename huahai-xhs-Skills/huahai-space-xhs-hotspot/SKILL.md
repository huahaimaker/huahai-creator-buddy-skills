---
name: huahai-space-xhs-hotspot
description: 用可用的小红书只读数据源按关键词搜集近期样本，保留原始精确互动与完整链接，并做可审计的形态、钩子和选题判断。用户问小红书最近火什么、某赛道能不能写、找爆款样本或比较两个方向时触发。数据源缺失、指标模糊、链接缺 token 或样本不足时明确降级，不编造热度。
metadata:
  dependencies:
    python: []
  optional:
    - REDFOX_API_KEY
---

# 小红书热点搜集

目标是回答：当前能观测到什么、哪些模式有样本支撑、下一篇可验证什么。数据快照不是平台全量数据，也不能证明因果。

## 能力矩阵

| 路线 | 关键词样本 | 精确互动 | 评论/账号作品 | 使用条件 |
| --- | --- | --- | --- | --- |
| 红狐脚本 | 是 | 仅当接口返回精确值 | 否 | `REDFOX_API_KEY` |
| 同仓库全域搜索 | 取决于后端 | 取决于后端 | 取决于后端 | 对应 OpenCLI/MCP/Guaikei 配置成功 |
| 公开网页搜索 | 标题与页面线索 | 否 | 否 | 当前运行环境有搜索能力 |

某个 Key 存在不代表所有能力可用。每次以实际退出码、`status`、`source/backend` 和原始字段为准。

供应商关于收录门槛、更新时刻、覆盖窗口的描述只能标“供应商口径”；脚本没有验证这些全库事实，不把它们写成平台规则。

## 1. 确认查询

至少确认关键词和时间窗，默认近 7 天。用户给精确词直接查；只有词义明显歧义、不同商业意图会改变结果时才询问。

用户给大类词时可从 `references/xhs_sectors.json` 取 3–5 个邻近方向，但不要擅自把一次查询扩大成十组任务。用户明确“就查这个词”时按原词执行。

## 2. 探测真实能力

先定位本文件所在目录为 `<skill_dir>` 和仓库根为 `<repo_root>`，再检查：

```bash
command -v python3
test -n "$REDFOX_API_KEY"
command -v node
```

需要备用后端时，读取同仓库 `huahai-gzh-Skills/huahai-global-content-search/SKILL.md` 的能力矩阵并按它执行。不要引用当前仓库不存在的外部 Skill，也不要写死某个客户端的安装目录。

完整路线见 `references/data_sources.md`。

## 3. 红狐执行

默认 JSON，不生成 HTML：

```bash
python3 <skill_dir>/scripts/fetch_xhs_hot_articles.py \
  --keyword '<关键词>' \
  --start-date '<YYYY-MM-DD>' \
  --max-items 20 \
  --output-format json \
  --output-file '<绝对输出路径>.json'
```

用户明确要可视化时才使用 `--output-format html` 和 `.html` 输出路径。

### 成功判据

1. 退出码为 0；
2. stdout 是一个 JSON 对象；
3. `status` 为 `success` 或 `empty`；
4. `source`、`keyword`、`retrievedAt`、`returnedCount` 存在；
5. 每个互动字段是精确整数或 `null`，不能是反推的 `1w+` 下界；
6. `noteLink` 要么是数据源原始完整链接，要么为空并标 `linkStatus` 不可用。

缺 `xsec_token` 的小红书正文链接不重建、不补齐、不标为可点击。

## 4. 保留原始层

JSON 中：

- 规范计数字段用于分析，只接受精确整数；
- `metricsRaw` 保存接口原值；
- 模糊字符串如 `5000+`、`1w+` 记为 `null`，不得参与中位数、比率或排序；
- 展示层可以格式化数字，但分析脚本只能读取精确层。

网页搜索兜底时只能分析标题、内容形态和页面线索；互动、账号量级、热度趋势一律标“未验证”。

## 5. 样本分析

先给样本表：标题、作者、发布时间、精确互动、原始链接和数据来源。再做：

1. 形态：清单、教程、测评、经历、避雷、资源等；
2. 标题钩子：数字、人群、痛点、反差、时效；
3. 互动结构：仅在赞藏评分享均为精确值时计算；
4. 时间分布：只描述样本发布时间分布，不推断平台推流；
5. 账号量级：只有粉丝字段精确可用时分析。

样本少于 8 条时只做定性描述。样本达到 8 条后，可读取 `references/pattern_extraction.md`，但其中占比档位是本 Skill 的分析约定，不是平台规则。

“Top 20 里 12 篇是清单”是观察；“做清单就会爆”是错误因果。

## 6. 多组对比

```bash
python3 <skill_dir>/scripts/compare_sets.py \
  '方向A=<绝对路径A.json>' \
  '方向B=<绝对路径B.json>' \
  --top 20
```

结构化输出：

```bash
python3 <skill_dir>/scripts/compare_sets.py A=a.json B=b.json --json
```

脚本接受红狐 `items[]`、怪壳式 `results[]`，以及同仓库全域搜索的成功 envelope。它会把模糊计数从绝对统计中排除，并报告 `exact_interaction_n`。

- 同一数据源、同一口径：可比较精确互动中位数和结构；
- 不同数据源：只比较形态、钩子和词层，绝对量级不可比；
- 同一关键词跨时间：必须确保查询规则与数据源一致。

## 7. 选题交付

只给有具体样本反链的建议：

```text
【选题】一句话方向
来源：数据源、查询词、时间窗、样本数
证据：具体样本标题 + 原始链接 + 精确字段
观察：形态/钩子在 N 条中出现 M 次
可复用：能迁移的结构
不可复用：身份、资源或账号壁垒
验证：下一篇只改一个变量，观察哪个指标
```

没有有效链接或精确互动时，仍可提出“待验证假设”，但不能包装成数据结论。数量以证据为准，不强制凑 3–5 条。

## 失败处理

| 条件 | 处理 |
| --- | --- |
| 无 `REDFOX_API_KEY` | 红狐脚本输出 error JSON、退出 1；再探测同仓库备用路线 |
| 所有结构化后端缺失 | 若有网页搜索则降级，仅给未验证方向；否则停止 |
| HTTP/API/结构错误 | 保留错误摘要，有限重试后非零退出 |
| 精确指标缺失 | 记 `null`，不反推、不纳入统计 |
| 原始链接缺 token | `noteLink` 为空并标不可用，不自行拼接 |
| 零结果 | `status: empty`，不拿无关热门内容补位 |
| 多组来源不同 | 禁止比较绝对互动量 |

## 反例黑名单

- 不把 `1w+` 当作 10000 计算中位数。
- 不从 `noteId` 重建正文链接。
- 不引用不存在的外部 Skill 或硬编码 runtime 路径。
- 不把供应商宣传口径写成小红书官方事实。
- 不因搜不到就断言赛道没人写或没有需求。
- 不编造评论区、粉丝量、更新时间或互动数。
- 不为凑数量提供没有样本支撑的选题。

## 资源

- `scripts/fetch_xhs_hot_articles.py`：红狐查询与精确 JSON 层。
- `scripts/compare_sets.py`：离线集合对比。
- `references/data_sources.md`：可执行路线与能力边界。
- `references/xhs_sectors.json`：大类词下切时按需读取。
- `references/pattern_extraction.md`：样本足够时按需读取。
- `test-prompts.json`：行为回归样例。
