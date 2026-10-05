## 2026-09-26 — 修「插件路径下页面空白」（渲染不许挂在握手/外部依赖上）

## 2026-10-05 — 念稿审阅页的观感换成 DSH 的设计令牌

作者决定把审阅面的观感统一到 DSH。这一页原先是"米色纸 + 宋体"的编辑风；**整页换成中性画布**
（白/深灰、无衬线），控件全部走 DSH 的语义 token（按钮 28px 档、输入、边框、圆角、浮起、状态、
焦点、滚动条、过渡曲线），并**跟随系统明暗**。

- **令牌表只有一份**，在公共接缝 `planners-review-core/assets/dsh-tokens.css`。模板里只留
  `/*__DSH_TOKENS__*/` 占位符，由 `scripts/start-read-aloud-review.mjs` 在生成 `index.html` 时内联
  （审阅页在不透明源 iframe 里继承不到宿主变量、外链样式表会被 403 打回，所以必须内联）。
  缺表或缺占位符时脚本**直接报错退出** —— 不然会产出一张没上样式的页面，而且不报错。
- **两层分清楚**：外壳（页头/念稿导航/按钮/输入/卡片/契约表）是界面 → 全走 token；
  画面预览（`.frame`/`.cell`/`.captions`）是**视频画面本身** → 保持"播放器是深色"，
  但底色从暖褐换成 DSH 的**中性深色**。
- **念稿正文的字号保留**（`--reading-size` 是 A+/A- 的可调阅读档），只把字族换成 token 那一串；
  行距保留 1.9 的宽松档 —— 那是给"念"用的，不是界面密度。

回归：页面在明暗两档下渲染正常（白 `#ffffff` / 暗 `#151517`，字 `#0f1115` / `#f9fafb`），无 JS 报错。

- **现象**：DSH 侧栏里的念稿审阅页是空的（静态骨架在、逐段那一半永远不画、控制台零报错）。
- **根因**：有插件时页面在不透明源 iframe 里，顶层 `localStorage.getItem(...)` **直接抛** SecurityError → 整页脚本当场死；
  同时页面把 `render()` 排在 `await ReviewBridge.connect()` 之后（桥不落地就永远不画）。
- **修**：① 本地存储走 `storeGet/storeSet/storeRemove`（拿不到就降级）；② **渲染先行**，再去连桥，`connect()` 带 1.5s 上限；
  ③ 连不上就在页面上写「本页只读」；④ 同款问题一起修进 `planners-bypage` 的审阅页。
- **判据**：`evals/run-validator-cases.mjs` 加 5 条（含 node vm 里"没有桥也能画出来"与"握手永不返回仍完整"两个反面对照）。
  基线 45 条 → 71 条，全过；退回旧写法的副本 12 条红（含 `localStorage … sandboxed` 原文）。
- **证据**：`.scratch/video-idea-seam/tools/plugin_handshake_harness.py` 的 init / no-init 两种模式原始输出。

# Changelog

## 2026-09-26 — 念稿审阅面上公共缝；修掉两个"覆盖人的决定"的坑

**起因**：本 Skill 的念稿审阅面自带 HTTP 服务器（生成页面 + serve + 收 POST + 开浏览器都在
`start-read-aloud-review.mjs` 里）。公共缝（`planners-review-core`）已经把宿主收走了，这一面上缝。

- **接缝**：新增 `scripts/review-surface.mjs`（surface 文档 + 写盘 + 唯一校验器）、
  `scripts/review-inbox.mjs`（收件：把宿主落盘的 `review-submissions.json` 翻译成原生 `feedback.json`，
  并把页面报上来的前提带进收据）、`scripts/lib/planners-modules.mjs`（找公共模组的适配器）。
  生命周期一行不写：模组 `review-host.mjs`（Node CLI）import 即用，**不引 python3**。
- **删掉自带服务器**：`start-read-aloud-review.mjs` 不再 `http.createServer`、不再有 `/api/feedback`
  与 `/asset?p=`；页面只留一个裸的 `{{REVIEW_BRIDGE}}` 注入点，靠宿主注入的桥写反馈与取素材。
- **样张素材改为复制进审阅目录**（`assets/`），页面用相对 `dir` 的路径 —— 原来那个
  `/asset?p=<任意绝对路径>` 端点要求把 `dir` 放大到所有素材的公共祖先（实测会是整个工作区）。
- **修坑 ①（R7，伪造人的决定）**：指纹一变旧反馈作废（原有语义，且会说出来），但作废之后页面是**空**的
  —— 每个 Beat 取默认 `approve`。于是"人标了需要修改 → 模型改完稿 → 重出审阅页 → 人只写一句整体意见就保存"
  会让那些 Beat **静默变回「这一段可录」**。现在：上一轮被人标过的 Beat 带回来当**待复核**（没有默认值，
  复核后点一下即通过），原话只作只读参考。真实项目上验过：`Skill 全集` 的上一轮 10 段 revise 全部回来待复核。
- **修坑 ②（词表外的取值被静默改写）**：真实文件里存在 `approved-after-typo-correction` 这类旧取值，
  页面的下拉框装不下它 → 保存时会被写成 `approve`。现在：**不猜、不改写**，当待复核并原样显示；收件层照样
  收下，但在收据里 `off_vocabulary_beats` 出声。
- **R11**：页面补一个**永久可见**的刷新出口（页头 `⟳ 刷新`），不依赖任何告警出现。
- **R5b**：页面知道、机器看不见的前提全部进数据（`reviewState`：上一轮是否作废、哪些段被标过、
  哪些段是默认通过人没碰、页面**没做**版本核对），由收件层摘进收据 —— 原生 `feedback.json`
  的形状**一个字段没变**。
- **测试**：`evals/run-validator-cases.mjs` 加 Part 4（20 条）：`--surface-only` 一次 start 都不发生、
  起→停不留进程不留端口、R3 注入点、R11 刷新出口、R7 待复核（含"每一处默认值赋值都必须读上一轮"的判据）、
  R5b 前提进收据而形状不变、两个反馈框各一条都被收下、词表外取值出声。
  基线 45 条 → 65 条，全绿；每条新断言在退回修正的副本上都红（5 条）。

