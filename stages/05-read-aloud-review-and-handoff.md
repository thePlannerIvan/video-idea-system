# Stage 5：念稿与样张审阅、交付

## 这一步在做什么

**整部片只有唯一的确认面，两种形状都过。** 在一个页面里同时完成朗读校准和画面检查。页面按 Speech Beat 组织，**一 Beat 一屏**：每屏占满视口，左边是这一段要念出口的文案，右边是这一屏的粗糙样张（花字层压在样张下沿）；样张下方是两个分开的反馈框——「口播 / 重录」和「视觉反馈」。该段没有画面时，文案占满宽度，只留一个反馈框，不显示样张空壳；**这一页本身照开**，它仍然是确认那一段「怎么呈现」的地方。

**画面在念稿审阅这一页上就定调到故意简单的程度**：放哪张图、两张图是不是对比关系、用什么样的模型展示、模型上有什么字。粗糙可以，没定不行。纯口播的片在这一页上定的是「这一段怎么呈现」——出镜、素材、有没有画面支持——同样粗糙但同样要定。**没有第二种确认路径。**

整条流程的第 9–10 步：作者念过、反馈处理完，再写制作说明并核对产物，然后交接。

## 为什么需要这一步

之前所有的决定都在模型和作者之间来回，只有这一页是作者**用嘴**验过的：念不顺的句子、听着别扭的转折、说错的数字，都会在这里露出来。它同时是画面定调的地方——放哪张图、什么关系、什么模型、模型上什么字。跳过这一页，等于让作者第一次听见稿子是在录音时。

## 输入及其作用

- `deliverable/script.md`：念的内容与 Beat 边界。
- `deliverable/visual-plan.json`：右半屏的样张与每屏的内容契约。
- `deliverable/assets/`：样张引用的真实素材，路径从这里解析。
- `_idea/current.md` 与 `story-lock.md`：判断反馈是内容缺口、形式偏好，还是主张/结构问题。

## 主要结果与认知动作

一份作者真的念过、并给出分栏反馈的 `feedback.json`，和处理完反馈后的稿件、契约与样张；加一份可以交接的 `production-brief.md`。认知动作是**听反馈分诊**：把每条意见判成内容缺口、形式偏好或上游问题，再决定改哪里。

### 启动审阅

页面由**审阅宿主**打开（别用手开 `index.html`：页面靠宿主注入的桥说话）。按"宿主有没有 `review_open` 工具"选一条：

```bash
# 有插件：只写审阅面并报出它的绝对路径，交给宿主的 review_open —— 不起本地宿主
node "<本 Skill 目录>/scripts/start-read-aloud-review.mjs" \
  --script "<project>/deliverable/script.md" \
  --visual-plan "<project>/deliverable/visual-plan.json" \
  --review-dir "<project>/_idea/reviews/script" \
  --asset-root "<素材根目录，可重复；不传时默认取项目根>" \
  --surface-only

# 没有插件：同一个脚本起本地宿主并自动打开浏览器
node "<本 Skill 目录>/scripts/start-read-aloud-review.mjs" \
  --script "<project>/deliverable/script.md" \
  --visual-plan "<project>/deliverable/visual-plan.json" \
  --review-dir "<project>/_idea/reviews/script" \
  --asset-root "<素材根目录，可重复；不传时默认取项目根>" \
  --port 0
```

作者保存之后**先收件，再分诊**（收件层把提交翻译成 `feedback.json`，并把页面报上来的前提带进收据）：

```bash
node "<本 Skill 目录>/scripts/review-inbox.mjs" --surface "<project>/_idea/reviews/script/review-surface.json"
```

收据里这三件事要读：`review_state.defaultedBeats`（**哪些段是默认通过、作者没碰**）、
`review_state.flaggedBeats` / `redecidedBeats`（上一轮被标过的段、这一轮复核过的段）、
`pre_check`（页面**没做**版本核对 —— 它读不到审阅目录之外的稿子，指纹一致性由收件层与生成器记录比对）。

**纯口播省略 `--visual-plan`，省略的是右半，不是这一页。** 审阅页只接受一 Beat 一屏的契约（`contract_version 5.0`；旧 4.0 仍能打开，但没有样张）。`sample.assets[].path` 按素材根解析，找不到的素材会在样张里标出缺口而不是静默变白。**没有任何上屏文字的屏是合法的**，只要它用 `sample.assets[]` 声明了素材；一屏在页面上什么都显示不出来时，脚本直接 exit 2 而不是静默跳过。脚本生成页面、启动本地服务并自动打开浏览器；不要只给 URL。

**两种形状共用这一个审阅目录**（`<project>/_idea/reviews/script`），不再分两个目录。

告诉用户：

> 一段一屏，从上往下走。左边是这一段要念出口的文案，右边是这一屏大概的样子。念左边、看右边：口播改法或重录稿写左边的框，画面的意见写右边的框。画面这一页只定到「哪张图、什么关系、什么模型、模型上什么字」，不求精致——但不要留着不定。完成后保存并回到 DSH。

随后结束当前回合，不轮询、不替用户生成反馈。

## 判断框架

- **页面显示得出来**：每一屏在页面上都有东西——契约、素材或花字至少一样；样张里的缺口被标出来而不是变白。
- **两个反馈框各管一段**：口播问题进「口播 / 重录」，画面问题进「视觉反馈」；同一个框里混着两类意见时要拆开。
- **「图注」不是上屏文字**：素材框下沿带「图注」标记的小字只为认素材，不上屏；上屏的字只有花字层与契约里以「文字：」声明的条目。
- **反馈分三类**：内容缺口（样张里少了必须出现的东西、素材不对、字打错）改契约或换素材；形式偏好（构图、样式、动效）记录给下游；主张或结构问题回上游。
- **常见误判**：把作者的一句观感当成必须执行的构图指令；把形式意见当内容缺口改契约；为了“页面干净”忽略掉标记为缺口的素材。

## 不要做什么

- 不做页面内录音（用户自己用别的软件念并录好，把重录后的稿子或意见贴回框里）；
- 不把口播与画面合并成一个反馈框；
- 不轮询、不替用户生成反馈、不替用户点保存；
- 不把形式偏好倒灌成上游画法；
- 不因为页面里能看就跳过念稿。

### 页面硬规则

- **一 Beat 一屏**：每屏占满视口，逐屏往下走；口播与样张同屏可对照，不把多段挤在一屏里读。
- 样张只用真素材静态摆放（图片、原始数据行、报告实物、归档图集、录屏），不做动效、不排字体配色、不追求精致；**标注过的概念示意不算样张**。
- 花字层压在样张下沿；数组最后一条按重点句呈现。
- 一个 Beat 最多一屏；不同 Beat 的样张不得合并成页面顶部总图。
- 反馈必须分两个框：「口播 / 重录」（可贴重录后的稿子，也可写口播问题）与「视觉反馈」；不得合并成一个框。
- 没有画面的 Beat 不显示空壳或“暂无画面”；**但这一屏的内容契约仍然显示在页面上**（折叠在下方），因为它也是这一页要确认的东西。
- 页面持续显示“阿祖不看 TVC · demyth.info”水印，但不写入口播稿。
- 输入反馈后自动切为“需要修改”；未提交输入优先写入审阅宿主声明的 `draft` 文件，宿主不可用时才退回浏览器本地暂存；显式保存仍交给审阅宿主（页面**不自带服务器**）。
- **上一轮被标过「需要修改 / 删除这一段」的 Beat，重出审阅页后回到「待复核」**：它们不再默认通过，作者复核后选一个状态即可（点一下「这一段可录」就是通过，不需要清空任何东西）。上一轮的原话只作**只读参考**显示，不预填进输入框。
- 词表（`approve` / `revise` / `cut`）之外的旧取值**不猜、不改写**：页面把它当「待复核」，原值照原样显示。
- 反馈绑定当前 `script.md`、`visual-plan.json` **以及样张引用素材的指纹**：稿子或素材一换，旧反馈自动作废。**作废会说出来**——脚本在控制台打印作废原因，页面顶部出现橙色横幅写明上一轮反馈已作废、备份到哪个文件；作者不会只发现意见不见了。

## 工作方式

1. 生成页面、打开它，把上面那段话告诉作者，然后结束回合等作者回来。
2. 用户返回后，确认 `feedback.json` 与当前 Hash 一致（页面上的作废横幅和启动输出里的 `invalidated_feedback` 都说明它是否一致）。
3. 逐 Beat 处理 `spokenNotes`（口播 / 重录）与 `visualNotes`（视觉），以及 `status` 的 `revise`、`cut`。
4. 贴进来的重录稿优先视为用户声音证据，但仍检查事实与逻辑。
5. 视觉反馈分两类处理：**内容缺口**改内容契约或换素材重拼样张；**形式偏好**记录下来交给下游，不在本阶段实现。
6. 修改 Storyline 前回 Stage 3；修改主张前回 Stage 2；需要重新讨论核心时回[洞察与目标](../references/洞察与目标.md)。
7. 更新稿件、契约与样张后重新生成并打开完整页面。

### 批准与交付

全部 Beat 批准且用户明确整体可录后，**有 `visual-plan.json` 就运行**（两种形状都一样，纯口播没有契约就跑不了、也不需要跑）：

```bash
node "<本 Skill 目录>/scripts/validate-visual-plan.mjs" \
  "<project>/deliverable/visual-plan.json" \
  --script "<project>/deliverable/script.md"
```

交付按**片级形状**分（只有两个值）：

- **纯口播**：交付 `script.md` 与确有需要的素材；
- **口播 + 画面**：交付 `script.md`、`visual-plan.json`、`visual-blueprint.md`、`production-brief.md` 和 `assets/`。

静态画面在**录制之前**由做画面那一步产出，不在本阶段画。读取 `../references/downstream-handoff.md` 说明下一步的顺序：**做好静态画面 → 录人声 → 交 `video-craft` 剪时间线**。

### 交接前核对产物

```bash
node "<本 Skill 目录>/scripts/check-handoff-artifacts.mjs" --project "<project>"
```

它核对 `.video-story/story-lock.md`、`_idea/method-history.json`、`_idea/ideas.json`、`_idea/web/` 在不在，以及 `deliverable/assets/` 是否恰好等于契约引用的那几张。报出的每一项都拿去问作者：这一步是跳过，还是漏了？作者说跳过，就在 `_idea/current.md` 记一行「跳过 <步骤>：<原因>」；说漏了就补做。**核对通过再交接。**

## 人机介入

这一步几乎全是人机介入：作者实际念一遍并保存反馈，是唯一的批准门禁。模型负责生成页面、分诊反馈、改对应的地方；不替作者念、不替作者保存、不替作者宣布可录。

作者表示当前稿无需再念时，把这句话记进 `_idea/current.md`（连同日期），它等价于这一轮的朗读确认。

## 产物

- `_idea/reviews/script/`：`index.html`（页面）、`assets/`（从项目里复制进来的样张素材）、
  `review-surface.json`（审阅面）、`review-submissions.json`（宿主原样落盘的提交）、
  `review-context.json`（生成器写下的身份：稿子/契约/指纹/上一轮）、
  `feedback.json`（**原生记录**，收件层写的）+ `feedback.previous.json`（作废时的备份）。
- 更新后的 `deliverable/script.md`、`visual-plan.json`、`visual-blueprint.md` 与 `deliverable/assets/`。
- `deliverable/production-brief.md`：七项交接说明，含片级形状与按 Beat 的作者决定。

## 完成标准

- **语义完成**：两种形状都走过了这一个确认面；用户实际朗读过并保存反馈，或明确表示当前稿无需再念（并已记录）；页面里口播与样张同屏可对照，两个反馈框分别可用且没有混用；每屏与它正上方的一段口播一一对应，一 Beat 一屏，一屏只有一种状态；每一屏的简单设计（哪张图、什么关系、什么模型、模型上什么字）已经定下来，不是留白；内容契约只包含内容层信息责任与上屏文字/花字声明；样张里的素材全部真实存在，且没有变成设计交付；片级形状已记进 `_idea/current.md` 与 `production-brief.md`。
- **机器检查**：命令全部退出 0——
  ```bash
  node "<本 Skill 目录>/scripts/validate-visual-plan.mjs" \
    "<project>/deliverable/visual-plan.json" --script "<project>/deliverable/script.md"
  node "<本 Skill 目录>/scripts/check-handoff-artifacts.mjs" --project "<project>"
  ```
  加上启动审阅时的 `.video-story`/`_idea` 产物核对；`production-brief.md` 存在且七项都有内容。
- **不能由 Validator 证明**：作者是不是真的念过；某一屏这样定调是否会做出错误的片子；生产说明有没有把作者的决定说成模型的决定。
