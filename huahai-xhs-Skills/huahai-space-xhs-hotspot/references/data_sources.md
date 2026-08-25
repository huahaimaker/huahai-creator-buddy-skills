# 数据源路线

本 Skill 默认只承诺仓库内可定位的两条结构化路线。每次都要实际执行能力探测，不能根据文件存在或 Key 存在宣称成功。

## 路线 A：红狐脚本

入口：`../scripts/fetch_xhs_hot_articles.py`

条件：Python 3 与 `REDFOX_API_KEY`。

```bash
python3 <skill_dir>/scripts/fetch_xhs_hot_articles.py \
  --keyword '通勤穿搭' \
  --start-date '2026-08-18' \
  --max-items 20 \
  --output-format json \
  --output-file '<绝对路径>.json'
```

| 参数 | 约束 |
| --- | --- |
| `--keyword` | 必填；空字符串表示全站查询 |
| `--start-date` / `--end-date` | `YYYY-MM-DD`，开始不得晚于结束 |
| `--max-items` | 大于 0 |
| `--page-num` | 大于 0 |
| `--page-size` | 1–50 |
| `--max-retries` | 大于 0 |
| `--output-format` | `json` 或 `html` |

JSON 模式 stdout 是结构化结果；stderr 是诊断。缺 Key、HTTP/API 或结构错误返回 error JSON并退出 1。参数错误退出 2。

数据边界：

- 来源是第三方快照，不是小红书官方接口；
- `metricsRaw` 保留接口原值；
- 只有精确整数进入规范计数字段；
- 完整正文链接必须来自接口原字段，缺 token 时不可用；
- 收录门槛、全库更新时间和覆盖范围若接口结果未携带，只能作为供应商声称另行标注。

## 路线 B：同仓库全域搜索

入口 Skill：`<repo_root>/huahai-gzh-Skills/huahai-global-content-search/SKILL.md`。

先按其能力矩阵探测小红书后端，再执行关键词搜索。成功 envelope 可直接交给：

```bash
python3 <skill_dir>/scripts/compare_sets.py '标签=<全域搜索结果.json>' --json
```

只有 envelope `status: success`、`backend` 明确且 `raw` 能解析为带 `results[]` 或 `items[]` 的 JSON 时才能做数值分析。原始文本不是 JSON 时只能人工查看，不能硬转统计。

## 路线 C：公开网页搜索

只有当前运行环境确实提供网页搜索能力时使用。记录每个页面 URL、检索词和检索日期。

能做：标题钩子、内容形态、有人讨论的方向。

不能做：互动量级、粉丝量、评论结构、平台热度趋势。所有结论标“未经结构化互动数据验证”。

## 可选外部适配器

用户若明确提供其他 CLI 或 API，可在不写入、不互动的前提下接入。先验证：命令存在、凭证匹配、成功退出、stdout 结构、字段含义和完整链接。未经当次验证，不把外部包名写成默认可用依赖。
