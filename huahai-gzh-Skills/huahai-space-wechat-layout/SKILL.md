---
name: huahai-space-wechat-layout
description: 将用户提供的 Markdown 或中文长文转换为可本地预览、可复制富文本的公众号 HTML。使用仓库内零依赖渲染器生成内联样式文章，输出来源哈希、区块数和明确错误状态；支持 claude、openai、google 三种克制风格。只做排版，不改写事实，不生成配图。
metadata:
  dependencies: []
---

# 微信公众号 HTML 排版

交付一个真实 `index.html`，其中预览壳与待复制文章分离。文章区使用内联样式；复制按钮只复制文章 HTML 和纯文本，不复制工具栏。

## 1. 输入边界

- 用户未提供文章时，只请求正文和标题；不要生成空壳或补造正文。
- 默认接受 UTF-8 Markdown。
- 保留事实、数字、引用、代码、段落顺序和结论。
- 只允许：规范标题层级、按自然语义拆长段、把明确的列表和表格转为对应 HTML。
- 不负责改写标题、润色观点、生成配图或删除“看起来不重要”的内容。

如输入是 PDF、网页或图片，先用相应工具提取并让用户确认文本，再进入本 Skill。

## 2. 使用固定渲染器

脚本：`scripts/render_wechat_layout.py`

```bash
python3 scripts/render_wechat_layout.py \
  --input /absolute/path/article.md \
  --output /absolute/path/wechat-layout-output/index.html \
  --style auto
```

参数：

| 参数 | 说明 |
| --- | --- |
| `--input` | 必填，UTF-8 Markdown |
| `--output` | 必填，目标 `index.html` |
| `--style` | `auto / claude / openai / google`，默认 auto |
| `--title` | 可选，覆盖预览页标题，不修改正文 |

成功：退出 0，stdout 单一 JSON，包含 `status: success`、绝对输出路径、实际风格、来源字节数、区块数和文章 HTML SHA-256。

文件顶部若存在成对的 YAML frontmatter，渲染器会将它视作元数据而不显示在正文，并在 JSON 中返回 `frontmatter_removed: true`；其中的 `title` 可作为预览标题。

输入缺失、空文件、未闭合代码块：退出 2，stdout 为 `status: error` JSON。模板等内部错误退出 1。

## 3. 风格

只有用户没有指定时才使用 `auto`：

- 含代码、API、CLI 或技术教程 → openai；
- 表格或清单较多 → google；
- 叙事、评论和长文 → claude。

需要调整视觉时完整读取 `references/style-guide.md`。风格只改变颜色和层级，不改变内容结构。

设计底线：正文优先、留白克制、无大面积渐变、无重阴影、不把每段都塞进卡片、不在复制区放按钮或说明文字。

## 4. 支持的 Markdown

固定渲染器支持：

- `#` 到 `###` 标题；
- 段落、粗体、斜体、行内代码和 HTTP(S) 链接；
- 有序和无序列表；
- 引用、分隔线、围栏代码块；
- 标准管道表格。

原始 HTML 会被转义，不作为可执行内容注入。复杂嵌套、脚注、数学公式和本地图片不是当前固定路径的一部分；遇到时明确报告并单独处理，不能静默丢失。

## 5. 复制与兼容

模板：`assets/static-preview-template.html`

- 首选 Clipboard API，同时写入 `text/html` 和 `text/plain`；
- 不支持时使用选择文章节点的兼容复制；
- 复制内容是 `#article` 的内部文章节点；
- 文章内所有关键样式使用 inline style；
- 不依赖外部 CSS、字体、脚本、SVG 或交互组件；
- 预览页自己的脚本和 CSS 不进入复制内容。

不要在正文里加滚动窗口。编辑器可能移除 `overflow`，而且移动端阅读体验差。

## 6. 验证层级

按证据分层报告，不能跨级：

### A. 渲染器回归

```bash
python3 scripts/test_render_wechat_layout.py
```

验证：成功/失败退出码、JSON 合同、自动风格、事实文本保留、表格、代码、复制按钮、占位符清除、文章区无脚本注入。

### B. 本次产物结构

- 渲染器退出 0；
- JSON 可解析；
- 输出文件存在且非空；
- `article_sha256` 已记录；
- 关键原文抽样仍在 HTML 中；
- 源文件未被修改。

### C. 本地预览

```bash
python3 -m http.server 8000 --directory /absolute/path/wechat-layout-output
```

确认本地 URL 返回 2xx。能使用浏览器时再检查桌面/窄屏、表格溢出、代码换行和复制状态。

### D. 公众号编辑器实贴

只有把复制结果实际粘贴进用户当前公众号编辑器，检查样式、链接、表格、代码和保存后预览，才能称“公众号实贴通过”。本地预览和 HTML 结构通过不等于编辑器保真。

## 7. 失败处理

| 条件 | 处理 |
| --- | --- |
| 没有正文 | 请求正文，不创建输出 |
| 空文件 | 退出 2，返回错误 JSON |
| Markdown 语法不支持 | 报告具体结构，不静默删除 |
| 渲染失败 | 保留源文件，返回 stderr/stdout 和退出码 |
| 本地端口占用 | 换空闲端口并报告实际 URL |
| Clipboard API 不可用 | 使用兼容复制并显示真实状态 |
| 无法进入公众号后台 | 报告验证只到 A/B/C 层 |

## 8. 最终交付

必须告诉用户：

- 源文件和输出文件的绝对路径；
- 实际使用的风格；
- 渲染 JSON 中的区块数与 SHA-256；
- 已通过 A/B/C/D 哪些层；
- 如何在预览页点击“复制 HTML”；
- 任何未支持结构或未完成的公众号实贴验证。

行为回归见 `test-prompts.json`。
