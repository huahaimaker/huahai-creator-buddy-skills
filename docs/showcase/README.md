# README 效果图生成

运行：

```bash
node docs/showcase/render-showcase.mjs
```

脚本会真实加载仓库里的三个视觉模板并生成 README 素材：

- `huahai-xhs-Skills/huahai-xhs-html/assets/xhs-template.html`
- `huahai-gzh-Skills/huahai-space-text-logic-diagram/assets/template.html`
- `huahai-video-Skills/huahai-space-video-broll/scripts/example-composition.html`

输出位于 `docs/assets/`：

- `xhs-cover.png`
- `xhs-capability-map.png`
- `xhs-workflow.png`
- `logic-diagram.png`
- `broll-preview.gif`

依赖 Node.js、Playwright、Chrome 和 ffmpeg。小红书案例会在生成时检查 6 页数量、1080×1440 尺寸和内容溢出；B-roll GIF 由实际时间轴的 18 个状态帧生成。
