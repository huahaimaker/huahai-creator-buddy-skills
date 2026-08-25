#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const assets = path.join(root, "docs/assets");

function loadPlaywright() {
  try {
    return require("playwright");
  } catch {
    return require(
      path.join(
        os.homedir(),
        ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
      ),
    );
  }
}

function launchOptions() {
  const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  return fs.existsSync(chrome)
    ? { headless: true, executablePath: chrome }
    : { headless: true, channel: "chrome" };
}

async function renderXhs(browser) {
  const source = path.join(
    root,
    "huahai-xhs-Skills/huahai-xhs-html/assets/xhs-template.html",
  );
  const page = await browser.newPage({
    viewport: { width: 1200, height: 1500 },
    deviceScaleFactor: 1,
  });
  await page.goto(pathToFileURL(source).href, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts?.ready);
  await page.evaluate(() => {
    const html = (selector, value) => {
      document.querySelector(selector).innerHTML = value;
    };
    const text = (selector, value) => {
      document.querySelector(selector).textContent = value;
    };

    text("#p01 .eyebrow", "花海创作者工具箱");
    html("#p01 h1", "从一个选题<br>做到能发的<em>成品</em>");
    text(
      "#p01 .lede",
      "公众号、小红书、视频，一套 Skill 串起完整创作流程。",
    );
    const coverStates = document.querySelectorAll("#p01 .cover-result span");
    coverStates[0].textContent = "零散创作动作";
    coverStates[1].textContent = "可复用工作流";
    text("#p01 .account", "花海 · SeaMinnie");

    text("#p02 .eyebrow", "能力地图");
    html("#p02 h2", "三条创作链路<br>覆盖完整流程");
    text(
      "#p02 .head p",
      "先找真实平台信号，再把内容做成可以发布的成品。",
    );
    const cards = document.querySelectorAll("#p02 .card");
    const cardCopy = [
      ["公众号", "搜爆款、做配图、整篇排版"],
      ["小红书", "定位、选题、标题、图文复盘"],
      ["视频", "脚本、剪辑、B-roll、字幕音频"],
    ];
    cards.forEach((card, index) => {
      card.querySelector("h3").textContent = cardCopy[index][0];
      card.querySelector("p").textContent = cardCopy[index][1];
    });

    text("#p03 .eyebrow", "输入与边界");
    html("#p03 h2", "先确认素材<br>再选择对应 Skill");
    text("#p03 .head p", "链接、文章、视频或数据，都有明确的进入方式。");
    const panels = document.querySelectorAll("#p03 .panel");
    panels[0].innerHTML =
      "<h3>可以提供</h3><ul><li>平台链接或关键词</li><li>文章、逐字稿或素材</li><li>目标平台与受众</li></ul>";
    panels[1].innerHTML =
      "<h3>必须确认</h3><ul><li>内容事实不被改写</li><li>凭据与隐私不入库</li><li>成品有明确验收标准</li></ul>";

    text("#p04 .eyebrow", "执行链路");
    html("#p04 h2", "研究、生产、验收<br>三步做成内容");
    text("#p04 .head p", "每个 Skill 单独可用，也能由总控按任务自动路由。");
    const steps = document.querySelectorAll("#p04 .step");
    const stepCopy = [
      ["研究信号", "搜索热点、评论和竞品，确认读者正在关心什么。"],
      ["生产成品", "完成标题、正文、配图、视频、字幕与排版。"],
      ["检查交付", "校验路径、尺寸、数据边界和最终发布效果。"],
    ];
    steps.forEach((step, index) => {
      step.querySelector("h3").textContent = stepCopy[index][0];
      step.querySelector("p").textContent = stepCopy[index][1];
    });

    text("#p05 .eyebrow", "一行安装");
    html("#p05 h2", "把仓库地址<br>直接发给 Agent");
    text("#p05 .head p", "支持 Codex、Claude Code、Cursor 等兼容 Runtime。");
    document.querySelector("#p05 pre").textContent =
      "帮我安装这个 skill：\n\nhttps://github.com/huahaimaker/\nhuahai-creator-buddy-skills\n\n安装后列出全部 huahai- Skill。";
    text("#p05 .note", "所有 Skill 都使用 huahai- 前缀，避免和其他工具重名。");

    text("#p06 .eyebrow", "验收与复用");
    html("#p06 h2", "完成以后<br>检查这 6 项");
    text("#p06 .head p", "真实运行、清晰边界、可复用输出，三者缺一不可。");
    const checks = document.querySelectorAll("#p06 .check span");
    [
      "目录与 Skill 名都有 huahai- 前缀",
      "README 路径与实际目录一致",
      "输出尺寸与平台比例正确",
      "没有编造平台数据或运行结果",
      "凭据、Cookie 与隐私信息不入库",
      "成品可以继续编辑或直接发布",
    ].forEach((value, index) => {
      checks[index].textContent = value;
    });
  });

  const xhsProblems = await page.locator(".sheet").evaluateAll((sheets) => {
    const problems = [];
    if (sheets.length !== 6) problems.push(`页面数量为 ${sheets.length}，应为 6`);
    sheets.forEach((sheet, sheetIndex) => {
      const sheetRect = sheet.getBoundingClientRect();
      if (Math.round(sheetRect.width) !== 1080 || Math.round(sheetRect.height) !== 1440) {
        problems.push(`第 ${sheetIndex + 1} 页尺寸不正确`);
      }
      sheet.querySelectorAll("*:not([data-allow-overflow])").forEach((element) => {
        const rect = element.getBoundingClientRect();
        if (
          rect.left < sheetRect.left - 1 ||
          rect.top < sheetRect.top - 1 ||
          rect.right > sheetRect.right + 1 ||
          rect.bottom > sheetRect.bottom + 1
        ) {
          problems.push(`第 ${sheetIndex + 1} 页有元素越出画布`);
        }
      });
    });
    return [...new Set(problems)];
  });
  if (xhsProblems.length) {
    throw new Error(`小红书案例校验失败：${xhsProblems.join("；")}`);
  }

  const shots = [
    ["#p01", "xhs-cover.png"],
    ["#p02", "xhs-capability-map.png"],
    ["#p04", "xhs-workflow.png"],
  ];
  for (const [selector, filename] of shots) {
    await page.locator(selector).screenshot({
      path: path.join(assets, filename),
      type: "png",
    });
  }
  await page.close();
}

async function renderLogicDiagram(browser) {
  const source = path.join(
    root,
    "huahai-gzh-Skills/huahai-space-text-logic-diagram/assets/template.html",
  );
  const page = await browser.newPage({
    viewport: { width: 1200, height: 900 },
    deviceScaleFactor: 1,
  });
  await page.goto(pathToFileURL(source).href, { waitUntil: "domcontentloaded" });
  await page.addStyleTag({
    content:
      "body{padding:28px;background:#ebe8df}.container{max-width:1040px}" +
      ".diagram-card{margin-bottom:0}.diagram-body{padding:6px 18px 12px}",
  });
  await page.evaluate(() => {
    document.body.dataset.theme = "light";
    document.querySelector("h1").textContent = "创作内容生产闭环";
    document.querySelector(".subtitle").textContent =
      "从真实平台信号，到可发布成品，再回到复盘";
    const overview = document.querySelectorAll(".overview-label");
    overview[0].textContent = "覆盖公众号 / 小红书 / 视频";
    overview[1].textContent = "29 个可独立调用的 Skill";
    overview[2].textContent = "研究 → 生产 → 验收 → 复盘";
    const cards = [...document.querySelectorAll(".diagram-card")];
    cards.slice(1).forEach((card) => (card.style.display = "none"));
    cards[0].querySelector(".label-tag").textContent = "创作闭环";
    cards[0].querySelector(".label-title").textContent =
      "内容不是一步生成，而是一条可复用的生产线";
    const replacements = new Map([
      ["深化", "判断"],
      ["扩展", "生产"],
      ["升华", "发布"],
      ["基础认知", "平台信号"],
      ["现象观察", "热点・评论"],
      ["深入理解", "内容判断"],
      ["原理分析", "选题・脚本"],
      ["系统构建", "成品生产"],
      ["框架搭建", "图文・视频"],
      ["创新", "验收"],
      ["突破边界", "发布复盘"],
      [
        "逻辑递进：从基础认知到创新突破的渐进发展过程",
        "真实信号 → 内容判断 → 成品生产 → 发布复盘",
      ],
    ]);
    cards[0].querySelectorAll("text").forEach((node) => {
      if (replacements.has(node.textContent)) {
        node.textContent = replacements.get(node.textContent);
      }
    });
    document.querySelector(".footer").textContent =
      "Huahai Creator Buddy · 模板真实渲染";
  });
  await page.locator(".container").screenshot({
    path: path.join(assets, "logic-diagram.png"),
    type: "png",
  });
  await page.close();
}

async function renderBrollGif(browser) {
  const source = path.join(
    root,
    "huahai-video-Skills/huahai-space-video-broll/scripts/example-composition.html",
  );
  const framesDir = fs.mkdtempSync(path.join(os.tmpdir(), "huahai-broll-"));
  const page = await browser.newPage({
    viewport: { width: 720, height: 896 },
    deviceScaleFactor: 1,
  });
  await page.goto(pathToFileURL(source).href, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts?.ready);
  const sampleTimes = [
    0.4, 1.2, 2.0,
    5.0, 7.0, 9.0,
    10.2, 11.5, 13.5,
    16.0, 18.0, 21.0,
    25.5, 27.5, 29.5,
    31.3, 32.5, 34.0,
  ];
  for (let index = 0; index < sampleTimes.length; index += 1) {
    await page.evaluate((time) => window.seek(time), sampleTimes[index]);
    await page.screenshot({
      path: path.join(framesDir, `frame-${String(index).padStart(2, "0")}.png`),
      type: "png",
    });
  }
  await page.close();

  const output = path.join(assets, "broll-preview.gif");
  const result = spawnSync(
    process.env.FFMPEG_PATH || "ffmpeg",
    [
      "-y",
      "-framerate",
      "3",
      "-i",
      path.join(framesDir, "frame-%02d.png"),
      "-vf",
      "fps=3,scale=360:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=3",
      "-loop",
      "0",
      output,
    ],
    { encoding: "utf8" },
  );
  fs.rmSync(framesDir, { recursive: true, force: true });
  if (result.status !== 0) {
    throw new Error(result.stderr || "ffmpeg 生成 GIF 失败");
  }
}

async function main() {
  fs.mkdirSync(assets, { recursive: true });
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch(launchOptions());
  try {
    await renderXhs(browser);
    await renderLogicDiagram(browser);
    await renderBrollGif(browser);
  } finally {
    await browser.close();
  }
  console.log(`README showcase written to ${assets}`);
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
