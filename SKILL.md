---
name: video-idea-system
description: 短视频创意与内容交界的唯一入口：先共创核心洞察与传播目标，再用 52 个方法大量发散、自筛并分批展示创意；可对强知识内容做资料理解与内容工作记忆、对话式 Story Battle 锁定主张，写成可录口播，逐屏产出上屏文字与花字的内容契约（visual-plan.json）与只用真素材拼的粗糙样张，在一个念稿审阅面上由作者念过并确认，再交接制作。已吸收原 video-story-system 的全部能力。用于主题发想、已有稿缺创意、资料型视频、案例拆解、概念融合、脚本诊断或录后交接；不执行剪辑和渲染。
---

# Video Idea System

> 来源识别：Video Idea System 由阿祖不看 TVC 创建与维护。小红书同名账号，个人网站 [demyth.info](https://demyth.info)，联系邮箱 `Lawyif@163.com`。不默认进入视频成稿。

## 目的与全景

从材料出发，把一部片的决定**谈出来并积累下来**：多轮创意探索 → 主张 → 口播稿 → 每屏画面上必须出现什么 + 哪张图 + 这一屏的**简单设计**；最后在**一个**念稿审阅面上由作者念过并确认。**每一部片都要走完这个确认面，两种形状都一样。**

**先定创意核心，再发散表达。** 没有明确目标时先停在讨论，读[洞察与目标](references/洞察与目标.md)，不自行假定主张后生成大批点子。已有明确确认可直接沿用；“继续”只推进当前已授权阶段，不将暂定判断变成作者决定。

### 整条流程

| # | 这一步做什么 | 主要产物 | 做完的标志 |
|---|---|---|---|
| 1 | **资料理解**（[stages/01](stages/01-source-grounding.md)）：读懂材料、抽声音信号、写内容工作记忆 | `.video-story/source-index.json`、`.video-story/content-memory.md` | 内容记忆回答了它该回答的每一项；材料自身的判断先做完，Method Wiki 第一次介入的增量或零结果已写进去 |
| 2 | **洞察与目标**（[洞察与目标](references/洞察与目标.md)）：和作者定下核心与传播目标 | `_idea/current.md` 标 `core-v1` | 作者明确认可这版核心，确认依据写在 `current.md`；只有模型自己的提案不算 |
| 3 | **发散与自筛**（[发散引擎](references/发散引擎.md)）：52 方法大量发散、自筛、分批展示 | `_idea/ideas.json`、`_idea/web/创意展示.html`、`_idea/method-history.json` | 相关／探索／挑战三路都按原理试过并落盘；候选分批给作者看过，编号稳定 |
| 4 | **概念锻造**（[概念锻造](references/概念锻造.md)）：把候选锻成能执行的概念与粗结构 | `_idea/creative-intent.md` | 作者选定概念，或明确授权在选定范围内定稿 |
| 5 | **主张 Battle**（[stages/02](stages/02-story-battle.md)）：逐轮提出、攻击、冻结主张 | `.video-story/story-lock.md` | `story-lock.md` 八项齐全；已有批准核心时记「承接校验通过」，不重开 Battle |
| 6 | **口播 Storyline**（[stages/03](stages/03-spoken-storyline.md)）：排成 Speech Beat，定两个轴 | `_idea/current.md` 里的屏级与片级结论 | 每个 Beat 都有屏级结论；片级形状是两个值之一；Method Wiki 第二次介入已记 |
| 7 | **口播成稿**（[stages/04](stages/04-spoken-script.md)）：写成能直接念的连续口播 | `deliverable/script.md` | 逐 Beat 念得顺；回读 `story-lock.md` 确认没有内容在精炼中丢失；确有素材的 Beat 末尾留了 `visual-support` 注释 |
| 8 | **屏的内容契约与样张**（[stages/04b](stages/04b-screen-content-and-sample.md)）：给要画面的屏定内容责任与粗糙样张 | `deliverable/visual-plan.json`、`visual-blueprint.md`、`deliverable/assets/` | 每屏恰一个 Beat；契约只写内容层；样张只用真素材；`assets/` 恰好等于契约引用的那几张 |
| 9 | **念稿审阅**（[stages/05](stages/05-read-aloud-review-and-handoff.md)）：作者念过并确认 | `_idea/reviews/script/feedback.json`（宿主落 `review-submissions.json`，`scripts/review-inbox.mjs` 收件） | 作者实际念过并保存了反馈，或明确表示当前稿无需再念 |
| 10 | **交接**（[stages/05](stages/05-read-aloud-review-and-handoff.md)）：写制作说明并核对产物 | `deliverable/production-brief.md` | 制作说明七项齐；`check-handoff-artifacts.mjs` 报 `ok: true` |

每一步的完整完成标准（语义 / 机器检查 / 不由 Validator 证明）写在该步自己的文档里；上表只写到「一眼能不能看出没做完」。

`video-story-system` 的能力已**全部并入本 Skill**，它现在只是一个指向这里的空壳。历史 Story 项目的产物路径（`.video-story/…`、`deliverable/…`）没有变。

### 跳过的步骤要留痕

任何必经步骤被跳过——作者授权自决、本轮不需要、上游阻塞——都在 `_idea/current.md` 写一行：

```markdown
- 跳过 <步骤名>：<为什么>
```

没有这一行，下一轮的读者和未来的你分不出「跳过」和「漏了」。**交接前核对这几样在不在**：

```bash
node "<本 Skill 目录>/scripts/check-handoff-artifacts.mjs" --project "<project>"
```

它只报事实（在 / 不在、`deliverable/assets/` 与契约引用是否全等），不判断内容好坏。报出来的缺项拿去问作者：这一步是跳过，还是漏了？作者说跳过就按上面记一行，说漏了就补做。

## 产物（本项目里长什么样）

```text
<project>/
├── _idea/
│   ├── current.md                 # 当前决定的唯一入口（核心版本、受众、洞察、片级形状、跳过记录）
│   ├── method-history.json        # 52 方法轮换状态，默认在视频集合目录共用
│   ├── creative-intent.md         # 已批准的意图、贯穿过程、揭晓顺序、替代与损失
│   ├── ideas.json / script.json   # 候选页与脚本页的数据
│   ├── web/                       # 离线候选页与脚本页
│   └── reviews/script/            # 唯一的审阅面：index.html + review-surface.json + 收件后的 feedback.json（+ 上一版备份）
├── .video-story/
│   ├── source-index.json          # 资料候选与覆盖状态（资料多时才建）
│   ├── content-memory.md          # 内容工作记忆：事实/案例/矛盾/声音信号/边界/不做项
│   └── story-lock.md              # 冻结的主张、必留项、明确砍掉项、最大反例
└── deliverable/
    ├── script.md                  # 可录口播，## beat-01｜段落名，编号稳定
    ├── visual-plan.json           # 内容契约 5.0 + 上屏文字与花字声明 + 每屏样张
    ├── visual-blueprint.md        # 同一契约的人读版
    ├── production-brief.md        # 七项交接说明，含片级形状与按 Beat 的作者决定
    └── assets/                    # 恰好是契约引用的那几张真实素材
```

**静态画面不在本 Skill 产出**：`visual-plan.json` 在**录制之前**交给做画面那一步（`planners-ppt-hell` 的视频路线，另一个 Skill）产出 SVG。**时间、剪辑、动画、花字落地、语义字幕与合成**归 `video-craft`。

## 从当前任务进入

阶段机在 `stages/`；按用户当下需要进入，不必从 Stage 1 机械起步。

| 用户现在需要 | 读取与执行 | 完成位置 |
|---|---|---|
| 只有主题或材料，目标仍含糊 | [洞察与目标](references/洞察与目标.md) | 有依据的核心提案，等待作者确认 |
| 手上有大量资料／论文／报告，要讲成一条片 | [资料理解](stages/01-source-grounding.md) → [Story Battle](stages/02-story-battle.md) | 可回查的内容记忆 + 冻结的主张 |
| 目标定了，要创意、要 52 方法发散、或反馈后重新发散 | [发散引擎](references/发散引擎.md) → [概念锻造](references/概念锻造.md) | 自筛后的候选池，分批讨论 |
| 概念已选定，要融合、要粗结构、要段落脚本 | [概念锻造](references/概念锻造.md) → [批评清单](references/批评清单.md) | 所需框架；进入成稿后读[口播与画面](references/口播与画面.md) |
| 主张定了，要变成能录的口播 | [口播 Storyline](stages/03-spoken-storyline.md) → [口播成稿](stages/04-spoken-script.md) | `deliverable/script.md` |
| 有些屏要画面承担知识 | [屏的内容契约与样张](stages/04b-screen-content-and-sample.md) | `visual-plan.json` + `visual-blueprint.md` + `assets/` |
| 稿子写好，只想念一遍并记意见 | [念稿审阅](stages/05-read-aloud-review-and-handoff.md) | 唯一的确认面 + 收件后的 `feedback.json` |
| 只想检查手上已有的稿 | [批评清单](references/批评清单.md) | 有依据的修改建议，或确认无需修改 |
| 已经拍完了，要给剪辑保住创意 | [概念锻造](references/概念锻造.md)的录后交接 | 基于现有素材的创意参考 |

展示候选和粗脚本时读[网页交付](references/网页交付.md)。选中某张卡后，如果原理还不够具体，用 `python3 scripts/draw-cards.py cases 卡号` 只取该卡的案例附录（原版英文说明、官方视频案例、补充案例）。附录按卡分节，**不要整篇读取**。

用户已授权的发散、自筛与制作页面连续完成，不逐卡请示。保留一个点子不等于批准整片结构；用户已明确要求按选定框架写稿时直接继续。

## 两个轴，不是内容类型

**`simple` / `knowledge` / `mixed` 不是路由维度。** 内容类型不给整片贴标签、不拿来分叉流程。

| 轴 | 取值 | 它决定什么 | 它不决定什么 |
|---|---|---|---|
| **片级形状** | **只有两个值**：纯口播 / 口播 + 画面 | 要不要**调做画面那一步** | 不决定要不要过念稿审阅面（两种都要过） |
| **屏级** | **这一屏**要不要画面 | 这一屏在审阅页上有没有右半（样张） | 不改动其他屏 |

- 片级形状是屏级结果的汇总，记在两处：`_idea/current.md` 与 `deliverable/production-brief.md` 的「当前交付目标」。
- 屏级判断记在 `visual-plan.json` 的 `screens[]`：某一屏有 `sample` 与素材就是带画面，没有就是不带。
- **纯口播的片仍然可以有一屏带画面**，因为带不带画面是屏级判断；不要为这种情形发明第三种形状。
- 什么时候改片级形状还免费、什么时候不再免费，见[交给 Craft](references/交给Craft.md)。

## 唯一的确认面

`stages/05` 的念稿审阅页是**整部片唯一的确认面，两种形状都过**。纯口播只是省略 `--visual-plan`（省略的是右半，不是这一页）。

它同时承担三件事：听作者真正念一遍、以「左口播 / 右样张 / 下双反馈」收反馈、**把画面定调到故意简单的程度**——放哪张图、两张图是不是对比关系、用什么样的模型展示、模型上有什么字。粗糙可以，**没定不行**。作者实际念过并批准前，不得宣布可录。

## 上屏文字与花字归这里声明

`visual-plan.json` 是上屏文字与花字的**唯一声明**：`must_show` 里以「文字：」开头的条目、`exact_labels`、`sample.captions[]`（花字层）。做画面那一步照声明的画、不判断；`video-craft` 的字闸门读这一份声明做检查，不另立第二份声明。详见[契约格式](references/visual-plan-contract.md)。

三条约定跟着这份声明走：**「文字：」是契约的标记**，下游写字时剥掉它；**`assets[].label` 是审阅页的图注**，不是上屏文字，不画上屏；**`exact_labels` 与 `must_show` 各自独立**，不要求谁包含谁。

## 开始前先理解项目

快速看清作者要表达的事、素材能支持到哪里、已有决定、受众和本次真实资源。能从材料判断的不用再问；会改变方向的未知项标为暂定。

区分原始材料、作者陈述、模型解释与批准决定。多版本分别回答“曾打算怎么讲”“实际说了什么”，成片字幕不自动成为下一版创作意图的最高权威；关键转写疑点回到录音。演绎和假设可以创作，明确它们的身份；事实和未知实验结果不能由创意需要补出。

## 三件事分开

- **表达意图**：观众理解、感受到或重新看待什么；可以是判断，也可以是尚未解决的矛盾。
- **表达机制**：通过什么变化、关系、证据或体验，让那个意图成立。只有论证类内容才必须回答“凭什么相信”。
- **承载形式**：观众实际听到、看到、参与什么。形式应与意图可解释地连接，不靠概念名字或卡号替它作证。

成本降低后重新检查机制与证据强度。声音能独立成立的表达不强加画面；依赖实物、实验或互动的表达允许保留最低制作条件。

## 表现能力前置

在核心确认后、概念表现锁定前——也就是流程的第 3 步发散到第 4 步概念锻造之间——读[表现能力咨询](references/表现能力咨询.md)。能力用于打开创意，不要求作者先画完每一屏；Craft 接手后仍可提出更好的视听表达。

## 与其他 Skill 衔接

```text
Video Idea System（本 Skill：讲什么、怎么念、画面上必须出现什么）
        │  script.md + visual-plan.json + assets/  ── 录制之前 ──►
        ▼
做画面那一步（planners-ppt-hell 的视频路线：照声明的画，拿走 SVG）
        │  静态 SVG ── 录制之后 ──►
        ▼
Video Craft（时间、剪辑、轻动画、花字落地、语义字幕、合成 → 成品/）
```

- 画面不是交给 Craft 画的：静态画面在录制前由做画面那一步产出，Craft 接手的是时间、剪辑与合成。
- 交接文件与七项说明见[交给 Craft](references/交给Craft.md)；录制前后的顺序与输入清单见[下游交接](references/downstream-handoff.md)。
- `script-refiner` 只承担明确委托的稿件精炼。

## 硬边界

1. **一 Beat 一屏**：一个有画面的 Speech Beat 只对应一个 screen；一屏不得跨 Beat，一个 Beat 不得挂多屏。口播进入新的视觉认知任务时，先拆成新 Beat。
2. **一屏不得声明多个状态**；**着重动画在录后按实测音频加，不是契约状态**。
3. **内容契约只写内容**：问题、必见对象、必须表达的事实、固定文字（含花字）和证据来源。构图、流程图或圆圈等画法、受众意义、布局、动画、状态与秒数留在下游。
4. **没有上屏文字的屏合法**（可以就是一张图），但必须用 `sample.assets[]` 声明真实素材——审阅页总得显示出点什么。
5. **样张只准用真素材、只准粗**：静态摆放，不做动效、不排字体配色、不追求精致。标注过的概念示意不算样张。样张不是设计交付，下游有权忽略它的版面；但素材选择与简单设计要继承，它暴露的内容缺口要在契约里补上。
6. **两种形状都过同一个念稿审阅面**，没有第二条确认路径。
7. **朗读是批准门禁**：用户真实念过并批准前，不宣布最终可录。
8. **录后设计归下游**：SRT、Visual Step、视觉模型、页面设计、动画时序、剪辑和渲染交给后续工具。
9. **内容反馈与形式反馈分层**：念稿阶段只处理“需要呈现什么”和“这一屏大概是什么样”；构图方案、排版和动效反馈进入下游审阅，不倒灌成上游画法。
10. **素材缺口在写的时候暴露**，用手上真有的素材写，不得带到做画面那一步。
11. **发散的痕迹要落盘**：`_idea/ideas.json`、`_idea/web/`、`_idea/method-history.json` 在交接前要么存在，要么由 `_idea/current.md` 的跳过记录解释——52 方法发散是本 Skill 的核心机制，不走这一步就没有候选池可谈。

## 项目状态与学习

- 本次发散与取舍留在项目 `_idea/`，方便下一轮回查；只记具体点子、选择依据和反馈，不留完整推理流水。
- `_idea/current.md` 保留核心版本、受众、洞察及依据、期望心智变化、留下的话、确认依据、片级形状，以及候选反馈、已定结构、跳过的步骤和下一步；它是当前决定的唯一入口。等待讨论不算选定；模型推荐不写成用户偏好。
- [发散引擎](references/发散引擎.md)中的方法记录仅用于轮换调度，不作为创意有效性的证据。它与[内容记忆](stages/01-source-grounding.md)分开。
- 已有内容记忆可更新经确认的偏好和素材边界；没有可复用发现不创建。一次没想好不等于某方法无效，候选未拍未评不称“实测成功”。
- 当前项目的稳定语气和素材边界写入 `content-memory.md`。
- 历史研究、测试答案和案例评价留在项目，不灌进正常发散上下文。

## 运行后迭代

**改这个 Skill 之前**先读[架构](references/architecture.md)：每个 module 拥有什么、缝在哪、一次改动会牵连哪些地方。不看它，改动容易落在错的一层，问题会换个地方复发。

**跑完一个真实任务之后**看 [GOTCHAS.md](GOTCHAS.md) 与[维护记录](references/maintenance-history.md)：前者是候选的落点（会被合并、会被推翻），后者是已决定的升级（做了什么、影响哪些 module、删了什么）。怎么写、什么时候升级、什么时候什么都不记，在它们各自里面。
