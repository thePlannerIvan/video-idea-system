# 这个 Skill 的架构：模块、接口、缝

读它的人只需要回答一个问题：**我要改 X，应该动哪里、会牵连什么。** 文件清单回答不了这个问题，边界才回答得了。所以下面每一行都写清「它拥有什么」和「它不做什么」。

词用的是 `codebase-design` 那套：module / interface / seam / adapter / depth。一个 Stage 文档、一个脚本、一份 Contract、一个 Reference、一组 Asset 都是 module。

## 1. 目的与全景

`video-idea-system` 稳定完成一件事：**把一个视频创意从材料谈成一个可录、可交接的内容包**——讲什么、怎么念、画面上必须出现什么。它不画画面，也不剪辑。

从输入到结果走十步。权威版本是 `SKILL.md` 的「整条流程」表；这里标出每一步落在哪个 module、落什么盘：

| 步 | 落在哪个 module | 落盘的产物 |
|---|---|---|
| 1 资料理解 | `stages/01` + `scripts/inventory-sources.mjs` | `.video-story/source-index.json`、`.video-story/content-memory.md` |
| 2 洞察与目标 | `references/洞察与目标.md` | `_idea/current.md`（标 `core-vN`） |
| 3 发散与自筛（52 方法） | `references/发散引擎.md` + `scripts/draw-cards.py` + `references/网页交付.md` | `_idea/ideas.json`、`_idea/web/`、`_idea/method-history.json` |
| 4 概念锻造 | `references/概念锻造.md` | `_idea/creative-intent.md` |
| 5 主张 Battle | `stages/02` + `references/story-battle.md` | `.video-story/story-lock.md` |
| 6 口播 Storyline（含两个轴） | `stages/03` + `references/method-wiki.md` | `_idea/current.md` 里的屏级与片级结论 |
| 7 口播成稿 | `stages/04` + `references/spoken-writing.md` | `deliverable/script.md` |
| 8 契约与样张 | `stages/04b` + `references/visual-explanation.md` + `references/visual-plan-contract.md` | `deliverable/visual-plan.json`、`visual-blueprint.md`、`deliverable/assets/` |
| 9 念稿审阅 | `stages/05` + `scripts/start-read-aloud-review.mjs`（生成 + 写 surface）+ `scripts/review-surface.mjs` + `scripts/review-inbox.mjs` + `assets/read-aloud-review.html` | `_idea/reviews/script/`（页面 + `review-surface.json` + 宿主落的 `review-submissions.json` + 收件后的 `feedback.json`） |
| 10 交接 | `stages/05` + `references/交给Craft.md` + `references/downstream-handoff.md` | `deliverable/production-brief.md` |

形状：**第 1–7 步谈决定与口播，第 8 步把决定翻成下游能消费的机器接口，第 9 步是唯一的确认面，第 10 步交接并核对。** 前八步都在产出「说什么」，第 8 步之后不再改内容，只改呈现。

## 2. 模块表

### 触发面与全景

| module | 是什么 | 拥有什么（唯一主人） | 接口 | 不做什么 |
|---|---|---|---|---|
| `SKILL.md` | 这个 Skill 的门面 | 整条流程的全景与每步「做完的标志」、按用户当下需要的路由、硬边界、三个迭代落点的指针 | 被模型与上游 Skill 读；frontmatter 的 `description` 是触发面 | 不定义字段语义（契约管）、不写判断框架（Reference 管）、不复述迭代规则 |
| `agents/openai.yaml` | 另一个运行时的界面元数据（显示名、短说明、默认提示） | 展示用文案 | 被那个运行时读 | 不是流程的一部分，改它不影响行为 |
| `GOTCHAS.md` | 候选池 | 有证据、会稳定导致错误的行为候选，及其状态与所属 module | 按 module 聚类读；一条一个根因 | 不装已决定的升级（那是维护记录） |
| `references/architecture.md` | 本文件 | 模块边界与缝、两个真相源、动的后果、退役清单 | 改之前读 | 不重复各 module 的内容细节 |
| `references/maintenance-history.md` | 已发生的升级 | 每次升级做了什么／为什么／影响哪些 module／删了什么 | 升级时追加，新的一次记在上面 | 不是 CHANGELOG，不记发版 |

### Stage 文档（流程骨架，也是唯一写「做完的标志」的地方）

| module | 拥有什么 | 接口 | 不做什么 |
|---|---|---|---|
| `stages/01-source-grounding.md` | 内容工作记忆（`content-memory.md` 的写法与最低内容）、材料清点、Method Wiki 第一次介入 | 读材料 → 写 `source-index.json` + `content-memory.md` | 不写稿、不建契约、不为少量材料机械建索引 |
| `stages/02-story-battle.md` | 冻结的主张（`story-lock.md` 的八项与冻结规则）、入口 A 的承接校验 | 读 `content-memory` + `current.md` → 写 `story-lock.md` | 不做 Storyline、不改已定结构、入口 A 不重新竞争方向 |
| `stages/03-spoken-storyline.md` | Speech Beat 序列、两个轴（屏级／片级）的结论、Method Wiki 第二次介入 | 读 `story-lock` → 写 `current.md` 的两轴结论 | 不写完整稿、不分配秒数、不建审阅页 |
| `stages/04-spoken-script.md` | `deliverable/script.md`（唯一的可录口播）、`visual-support` 注释、Voice Profile 的用法 | 读 `story-lock` + `spoken-writing` → 写 `script.md` | 不画画面、不建契约、不在录音前分秒数 |
| `stages/04b-screen-content-and-sample.md` | `visual-plan.json`、`visual-blueprint.md`、`deliverable/assets/` 的产出步骤与屏级判断 | 读 `script.md` + 磁盘真实素材 → 写上面三样 | 不写画法、布局、状态、动画、秒数、配色字体 |
| `stages/05-read-aloud-review-and-handoff.md` | 审阅面的启动与反馈处理、`production-brief.md` 的七项、交接前的产物核对 | 跑三个脚本；读 `feedback.json` → 改稿／改契约／回上游 | 不做页面内录音、不替作者保存与批准、不把形式意见改成画法 |

### Reference：判断与写法

| module | 拥有什么 | 接口 | 不做什么 |
|---|---|---|---|
| `references/洞察与目标.md` | 核心与传播目标的定法、「进入发散的条件」这道门禁 | 步 2 读；产出写成 `current.md` 的 `core-vN` | 不产出候选、不写稿 |
| `references/发散引擎.md` | 52 方法的三路用法（相关／探索／挑战）与轮换记录规则 | 通过 `draw-cards.py` 执行；写 `method-history.json` | 不替作者选定概念、不承诺方法数量 |
| `references/概念锻造.md` | 候选→可执行概念的锻造、`creative-intent.md` 的五项、录后交接 | 步 4 读；产出 `creative-intent.md` 与段落脚本 | 不写完整口播、不在未授权时锁定融合 |
| `references/批评清单.md` | 候选自筛与成稿后六项检查、诊断输出的格式 | 自筛与成稿后读；输出「位置→问题→影响→最小修法」 | 不做评分、不引入黄金秒数与爆款套路 |
| `references/网页交付.md` | 候选页与脚本页的数据字段与渲染方式 | 写 `ideas.json`／`script.json` → 交给 `render-review.py` | 不收集用户选择、不改内容、不覆盖模板 |
| `references/口播与画面.md` | 成稿阶段逐段口播与内容责任的组合写法 | 概念选定后读 | 不重复契约字段定义 |
| `references/story-battle.md` | Battle 的推进方式与攻击角度 | `stages/02` 按需读 | 不锁定主张（锁定发生在 Stage） |
| `references/spoken-writing.md` | 口播写法与声音判断（Voice Profile 的标准） | 步 1／4／8 读 | 不定契约字段 |
| `references/method-wiki.md` | 两次查询的用法、记录格式、零结果与冲突处理 | 通过 `planners-proposal-system` 的只读查询脚本访问 | 不替项目资料决定答案、不覆盖 `story-lock` |
| `references/表现能力咨询.md` | 「同一意思换一种机制承载」的查法 | 核心确认后、概念锁定前读；只读 `video-craft` 的能力表 | 不复制能力表、不把提案写成已实现 |
| `references/来源说明.md` | 52 方法卡库的来源与整理边界 | 需要引用卡库出处时读 | 不解释方法怎么用 |
| `references/案例附录.md` | 按卡分节的案例正文（原版说明、官方案例、补充案例） | 用 `draw-cards.py cases <N>` 取单卡一段，不整篇读 | 不做导航（导航由 `index` 给） |
| `references/cards.json` | 52 张卡的原理正文 | 被 `draw-cards.py` 读 | 不写项目相关内容 |
| `references/visual-explanation.md` | 「画面怎么承担解释」的判断框架 | 步 8 读 | 不写版面与画法 |

### 机器接口

| module | 拥有什么 | 接口 | 不做什么 |
|---|---|---|---|
| `references/visual-plan-contract.md` | 契约 5.0 的字段名单与语义、上屏文字与花字的声明口径、样张口径 | 文档真相源；被步 8 写下、被下游两侧读 | 不写画法／状态／时间；不复述 `video-craft` 的字段名单 |
| `scripts/validate-visual-plan.mjs` | 契约合法性的唯一判据（含 craft-owned 字段禁入、屏号唯一性、`script_hash` 绑定） | CLI：`<plan.json> [--script script.md]`，退出 0／2／3 | 不判断内容好坏、不检查素材是否存在（那是交接核对脚本） |
| `references/downstream-handoff.md` | 「谁交出什么、谁消费什么」的交接口径、录制前后的顺序、`script_hash` 的责任归属 | 交接前读 | 不定义字段语义（契约管） |
| `references/交给Craft.md` | `production-brief.md` 的七项结构、片级形状记在哪、改形状什么时候免费 | 步 10 读 | 不写画面方案、不承诺未录的声音 |

### 脚本

| module | 拥有什么 | 接口 | 不做什么 |
|---|---|---|---|
| `scripts/draw-cards.py` | 卡库读取、导航／取卡／取案例、轮换记录（`method-history.json` 的唯一写者） | 子命令 `index`／`show`／`cases`／`plan`／`record`／`stats` | 不生成点子、不评价创意、不预占卡 |
| `scripts/render-review.py` | 候选页与脚本页两个离线 HTML 的渲染 | `ideas\|script <json> --out-dir <dir>` | 不写页面内容、不联网 |
| `scripts/inventory-sources.mjs` | 材料清点 | `<project> --output <source-index.json>`（契约 `source-index/2.0.0`，公共件 `planners-source-index`） | 不读内容、不做事实判断、**不给未读文件算哈希** |
| `scripts/start-read-aloud-review.mjs` | **生成**审阅页与样张素材本地化、指纹与作废、写 surface；起停宿主交给公共模组 | CLI：`--script`／`--visual-plan`／`--review-dir`／`--asset-root`／`--port`／`--no-open`／`--surface-only` | 不做页面内录音、不生成反馈、不替作者保存、**不自己起服务器** |
| `scripts/review-surface.mjs` | 这份审阅面的 surface 文档 + `feedback`／`draft` 路径 + 走唯一校验器 | 被 `start-read-aloud-review.mjs` 调用；`--review-dir` 可直接跑 | 不做业务判断、不认识 Beat |
| `scripts/review-inbox.mjs` | 收件：把宿主落的提交翻译成原生 `feedback.json`，把前提带进收据 | `--surface <review-surface.json>` | 不改提交的语义、不解释审的什么 |
| `scripts/lib/planners-modules.mjs` | 「按名字找兄弟目录」的公共模组解析适配器 | `moduleScript('planners-review-core', …)` | 不缓存、不猜路径 |
| `scripts/check-handoff-artifacts.mjs` | 交接前的存在性核对（具名产物 + `assets/` 全等） | `--project <dir>`，退出 0／3 | 不判断内容好坏、不修改任何文件 |
| `scripts/compile_case_appendix.py` | 由工作区案例库编译 `案例附录.md` | 离线维护用 CLI | 不在运行路径上（源库变了才重跑） |

### 资产与模板

| module | 拥有什么 | 接口 | 不做什么 |
|---|---|---|---|
| `assets/read-aloud-review.html` | 审阅页的 DOM、样式、交互与 bootstrap 结构 | 被 `start-read-aloud-review.mjs` 注入数据后写成项目的 `index.html` | 不含项目内容、不读磁盘 |
| `assets/web/创意展示.html`、`assets/web/脚本.html` | 候选页与脚本页的离线模板（纸色、卡片、翻页） | 被 `render-review.py` 用 | 不含案例正文与项目图片 |

### 评测

| module | 拥有什么 | 接口 | 不做什么 |
|---|---|---|---|
| `evals/cases/*.json` | 八个契约固定样本（三个 `ok-*`、五个 `bad-*`） | 被 `run-validator-cases.mjs` 跑 | 不代表真实项目规模 |
| `evals/run-validator-cases.mjs` | 三部分断言：样本退出码／裁定写在实现里／流程可见 | `node evals/run-validator-cases.mjs` | 不测内容质量、不测观感 |
| `evals/evals.json` | 七个干净任务与 `must_do`／`must_not_do` | 人工或 Judge 跑 | 不是自动测试 |
| `evals/runbook.md` | 怎么跑、每条在证明什么、真实样本为什么是它、读不了图时怎么验证渲染 | 改动本 Skill 后读并照跑 | 不定义裁定（裁定在契约与 Stage） |

## 3. 缝与适配器

### 上游：作者与材料

- **作者**：给主题／草稿／资料／限制，并在三处做只有他能做的决定——认可核心、选定主张、念稿批准。模型不能替他做这三件。
- **材料**：项目目录里的原始文件。Stage 01 把它们读成 `content-memory.md`；此后各 module 读内容记忆与其中的回查记录，需要原文时回原文。
- 这条缝上有**两个 adapter**，所以它是真的：`inventory-sources.mjs` 把「目录里有什么」翻成 `source-index.json`；Stage 01 把「材料说了什么」翻成可回查的条目。

### 下游之一：做画面那一步（`planners-ppt-hell` 的视频路线）

- **谁交出什么**：本 Skill 交出 `deliverable/visual-plan.json` + `deliverable/assets/`。**「口播不进这一步」说的是内容**——它不拿口播去判断画面该画什么；而 `script.md` 就躺在契约旁边（同在 `deliverable/`），算哈希时够得着，见下一条。
- **谁消费什么**：它按 `screens[]` 逐屏出静态 SVG（页面源是 `_internal/02_svg_source/<page_key>.svg`），按 `sample.assets[]` 取图，并继承素材选择、图与图的关系、用什么模型展示、模型上的字、花字顺序。
- **adapter 在对面**：翻译层是 `planners-ppt-hell` 的 `adapt_visual_plan`（在 `scripts/init_svg_project.py` 里），它把契约翻成画面底稿。同一份 JSON 在本 Skill 里是审阅页的数据源，在它那里是画面清单——**契约是两个 Skill 共用的接口**，所以改字段必须两边同时改。
- **它核两样**：① `script_hash`——顺着契约文件所在目录找到 `script.md`，算 sha256 与契约比对，不符就**拦下**；**这一遍是唯一还来得及的**（工序是「做好画面 → 录人声 → 剪」，作者是**对着画面录**的）。② 契约文件本身变没变——它记 `visual-plan.json` 自己的 sha256。找不到 `script.md` 时报「无法核对」，不报成功。
- **卫生规则**：`deliverable/assets/` 与契约引用**全等**——少一张它拿到缺口，多一张它的全等检查会拦下来。

### 下游之二：剪辑（`video-craft`）

- **谁交出什么**：录制之后，本 Skill 的 `script.md`、`visual-plan.json`、`visual-blueprint.md`、`production-brief.md`、`assets/`，加上做画面那一步的静态 SVG（`scenes/`，一屏一个 `page_key`），一起进 craft 的 `input/`。
- **谁消费什么**：它把 Beat 对到实测 cue，按契约声明检查画面上真的会出字的地方，按实测音频加轻动画与语义字幕。
- **`script_hash` 的第二遍在这里**：craft 的 `input/` 里同时有 `script.md` 与契约，再核一遍，不符就停下来问作者——重绑 Hash，还是脚本改过、要回上游更新契约。**这一遍只能事后发现**：人已经录完了；还来得及的那一遍在做画面那一步。
- **不归本 Skill 管**：时间轴、EDL、剪辑、渲染、花字落地、字幕实现。

### 内部的缝

- **Stage → Stage**：每个 Stage 的「产物／完成标准」就是接缝的接口面。上一 Stage 的产物直接是下一 Stage 的输入，中间不另建转存文件；要新增中间文件，先看它是不是多余的中间层。
- **产出者 → 判据**：步 8 产出契约，`visual-plan-contract.md` 定语义，`validate-visual-plan.mjs` 判合法性。**写的人不当法官**是故意的：校验器只声称它能证明的部分。
- **页面 → 反馈**：`feedback.json` 绑定 `script.md`、`visual-plan.json` 与每张样张素材的**内容哈希**；三者任一变了，旧反馈作废并说明原因与备份位置。
- **决定 → 产物**：`_idea/current.md` 是唯一决定入口，`story-lock.md` 是冻结的主张。产物引用决定版本，不复制决定内容。

## 4. 与相邻 Skill 的关系

| 相邻方 | 它给本 Skill 什么 | 本 Skill 给它什么 | 什么不归本 Skill |
|---|---|---|---|
| 作者（人） | 主题／材料／限制；三处不可替代的决定 | 可讨论的核心、候选、可录口播、可确认的审阅页 | 代作者认可核心、选定主张、批准可录 |
| `planners-ppt-hell`（视频路线） | 静态 SVG（录制前交付） | `visual-plan.json` + `deliverable/assets/` | 画面怎么画、用什么风格、出 SVG |
| `video-craft` | 表现能力表（只读，用来打开创意）、风格库（`video-craft/visual/themes/`） | 内容包：`script.md` + 契约 + `assets/` + 制作说明 + 静态 SVG | 时间轴、剪辑、动画、字幕、合成、成品 |
| `planners-proposal-system` | Method Wiki 的只读查询入口 | 无（只读） | 维护 Wiki、提炼方法 |
| `script-refiner` | 明确委托的稿件精炼 | 无（委托关系） | 那条片的流程与判断 |
| `hyperframes` / `frontend-design` | — | — | **不是**本 Skill 的下游；画面不走动画工具，见交接文档 |

## 相邻 Skill 的架构文档

这份只写本 Skill 内部的 module。接缝的另一端在别处——改缝之前先读对面那一份：

| 相邻 | 它的架构文档 | 与本 Skill 的缝 |
|---|---|---|
| `planners-ppt-hell` | `03-design-delivery/planners-ppt-hell/references/architecture.md` | 本 Skill 交出 `visual-plan.json` + `deliverable/assets/`（「口播不进这一步」指不用它判断画面内容）；它消费成逐屏的静态 SVG 页，并核一遍 `script_hash`——**那一次还来得及** |
| `video-craft` | `03-design-delivery/video-craft/references/architecture.md` | 本 Skill 连同做画面那一步的 `scenes/`，交出 `script.md`、`visual-plan.json`、`assets/`、`production-brief.md`；它消费成时间轴与成片，并再核一遍 `script_hash`——**那一次只能事后发现** |
| `video-idea-system` | （本 Skill） | — |

## 5. 同一件事的两个真相源

分开是有意的，理由在这里；读的时候谁读谁、谁不读谁也写在这里。

### 5.1 契约文档 ↔ 校验器（**一对，改一处必须改另一处**）

`references/visual-plan-contract.md` 写字段语义，`scripts/validate-visual-plan.mjs` 执行它。两者对不上的地方就是 bug：文档说合法而校验器拒绝，或反过来。改契约字段时**同时**要动：契约文档、校验器、`evals/cases/` 的固定样本、（如果涉及裁定措辞）`evals/run-validator-cases.mjs` 的 Part 2、以及交接文档里那张继承表。

### 5.2 `_idea/current.md`（唯一决定入口）↔ `.video-story/story-lock.md`（冻结的主张）

- **`current.md` 是当前决定的入口**：核心版本、受众、洞察及依据、期望变化、片级形状、候选反馈、已定结构、**跳过的步骤**、下一步。它是「现在算数的是哪一版」的唯一答案。
- **`story-lock.md` 是冻结的主张**：一句话主张、观众原有理解、新理解或承诺、最强 Hook 领地、必留项、明确砍掉项、最大反例与证据边界。
- **谁读谁**：写稿与建屏时读 `story-lock`（不能丢已确认内容）；判断「这一版是哪一版」「形状是什么」时读 `current.md`。两者冲突时以 `current.md` 的版本号为准，并把冲突报给作者，不在下游自行裁决。
- **为什么不合成一个文件**：一个是一直在被改写的当前状态（每轮都动），一个是冻结后要防丢的承诺（改它必须有作者的新决定）。合成会让「改」和「别动」共用一条路径。

### 5.3 上屏文字与花字的唯一声明

`visual-plan.json` 是上屏文字与花字**唯一的声明**：`must_show` 里以「文字：」开头的条目、`exact_labels`、`sample.captions[]`。`video-craft` 的字闸门读这一份，**不建第二份** `on_screen_text.json` 之类的文件。「文字：」是契约的标记，下游写字时剥掉；`sample.assets[].label` 是审阅页的图注，不进这三层，也不画上屏。

### 5.4 两个审阅面（**故意不互操作**）

本 Skill 的念稿审阅页在 `_idea/reviews/script/`（`start-read-aloud-review.mjs` 生成，左口播／右样张／下双反馈，反馈绑指纹）；剪辑那一侧另有自己的视觉审阅面（要求 `<project>/review/index.html` + `timeline/timeline.json`，服务端口被占会直接报错退出）。作者已裁定**审阅画面不跨 Skill 合并**，所以两边目录约定不同、互不读对方的文件。接力时要在交接里说清「哪一页归谁」，不要试图让一方的服务打开另一方的页面。

### 5.5 卡库 ↔ 案例附录

`references/cards.json` 是 52 张卡的原理正文（唯一事实源）；`references/案例附录.md` 是**切片**，按卡分节，用 `draw-cards.py cases <N>` 取一段。附录可以从源库重新编译（`compile_case_appendix.py`），不反向修改卡库。

## 6. 改了 X 会牵连什么

### 改契约字段

| 要动 | 为什么 | 跨 Skill？ |
|---|---|---|
| `references/visual-plan-contract.md` | 字段语义的文档真相源 | 否 |
| `scripts/validate-visual-plan.mjs` | 判据必须跟上，否则文档与校验器打架 | 否 |
| `evals/cases/*.json` + `evals/run-validator-cases.mjs` | 固定样本与断言要覆盖新字段 | 否 |
| `stages/04b` 的工作顺序与完成标准 | 产出者要按新语义写 | 否 |
| `references/downstream-handoff.md` 的继承表 | 下游必须知道哪些字段不能丢 | 否 |
| `scripts/start-read-aloud-review.mjs` + `assets/read-aloud-review.html` | 审阅页要能显示新字段，否则作者看不到它；改 bootstrap 字段要同时看 `review-inbox.mjs` 的白名单与 `evals/run-validator-cases.mjs` Part 4 | 否 |
| `planners-ppt-hell`：`scripts/init_svg_project.py` 的 `PLAN_SCREEN_KEYS`／`PLAN_SAMPLE_KEYS`／`PLAN_ASSET_KEYS` 与 `adapt_visual_plan`（见它那份架构文档的「动了 X 会牵连什么 · 契约字段」） | 它按字段名把契约翻成画面底稿；认不出的字段**当场点名**——新字段没带过去会立刻报出来 | **是** |
| `video-craft` 四个读契约的地方：`helpers/check_screen_text.py`（读声明的字闸门）、`helpers/check_script_hash.py`（核 `script_hash`）、`visual/scripts/align-visual-plan.py`（把 Beat 对到实测 cue）、`references/video-story-handoff.md`（接收口径读 `screens`／`screen_id`）（见它那份架构文档 §3.1 与模块表） | 它按同一份声明检查画面上真的会出字的地方、核对稿件与契约是不是同一版、并对齐 Beat——四处都按字段名读 | **是** |

结论：契约字段不是本 Skill 的内部细节。改之前确认两侧都动——ppt-hell 侧改那三份键清单与适配器，craft 侧改它读契约的那四处。只改本侧，要么下游当场点名报错，要么字段进了契约却没有任何消费者。

### 改屏号派生规则

`screen_id` 由 `beat_id` 派生、全局唯一且稳定，原样成为下游的 `page_key`（不改名、不重新编号）。

| 要动 | 为什么 | 跨 Skill？ |
|---|---|---|
| `scripts/validate-visual-plan.mjs` | 唯一性与 Beat 绑定检查 | 否 |
| `scripts/start-read-aloud-review.mjs` | 按 `beat_id` 建 `screenMap`；审阅页锚点与反馈 id | 否 |
| `evals/cases/*.json` + `evals/run-validator-cases.mjs` | 固定样本与断言里的屏号 | 否 |
| 已完成项目的既有反馈 | 屏号一换，旧反馈与新契约对不上（指纹同时变，作废会说明） | 否 |
| `planners-ppt-hell`：`screen_id` 原样成为 `page_key`，页面源是 `_internal/02_svg_source/<page_key>.svg`（见它那份架构文档的「动了 X · id 命名」） | 改名等于**已交付页面的重新交接**，存量页面要重出 | **是** |
| `video-craft`：`visual/scripts/import_svg_page.py` 按 `page_key` 把页面图片落成 `assets/pages/<page_key>/…`，`scenes/` 与时间轴也按同一 `page_key` 对齐 | 文件名与目录跟着 `page_key` 走，改名就断链 | **是** |

改它等于一次迁移，不是一次改名。

### 改审阅页布局

牵连 `assets/read-aloud-review.html`、`start-read-aloud-review.mjs` 的 bootstrap 字段（`beats`／`feedback`／`invalidated`／`priorRound`）、`review-inbox.mjs` 的白名单、`stages/05` 的「页面硬规则」与完成标准、`evals/runbook.md` §3 的核对项、`evals/run-validator-cases.mjs` 里那句「唯一的确认面」断言。连审阅目录约定一起改时，还要同步 `video-craft` 的 `references/review-ui.md` 开头那张交接表与它那份架构文档 §3.4（它只登记「另一套审阅页在哪、什么时候交棒」）。**不牵连契约**——审阅页是消费者，不是声明源；改布局不该改字段。

### 改 Stage 划分

牵连 `SKILL.md` 的全景表与路由表、各 Stage 的输入与产物指针、`scripts/check-handoff-artifacts.mjs` 里每个具名产物的 `home`、`evals/run-validator-cases.mjs` Part 3 的结构断言、本文件的第 1、2 节、以及 `GOTCHAS.md` 里的 module 归类。

**跨 Skill：否。** 下游只认产物（`script.md`、`visual-plan.json`、`assets/`、`production-brief.md`），不认 Stage 名，所以拆并 Stage 不会让下游失配——它只会让本 Skill 的文档与检查脚本互相打架。新 Stage 要么有真产物，要么是现有 Stage 里的一段判断。

## 7. 退役

| 已退役的东西 | 现在的状态 | 为什么这样处理 |
|---|---|---|
| `video-story-system` | 只剩转发壳（`SKILL.md` + `agents/openai.yaml`），没有流程 | 能力已全部并入本 Skill。保留壳是因为旧的调用名还在被使用：删掉整个目录会让人得到「找不到 Skill」，而不是「改走 `video-idea-system`」。壳的成本是两个声明文件、零流程；删除与否是所有者的决定 |
| 历史 Story 项目的产物路径 | **没有变**：`.video-story/source-index.json`、`content-memory.md`、`story-lock.md`、`deliverable/…` | 路径是跨会话的契约。改名会让已存在的项目目录、审阅页与反馈全部失配，代价远大于整齐 |
| 契约 4.0 的 `blueprints`／`blueprint_id` | 仍能读，不再新增；校验器给 warning | 存量项目要能打开；新内容一律用 `screens`／`screen_id` |
| 旧框架字段（`viewer_should_understand`、`information_to_show`、`information_surplus`、`evidence_refs`、`information_not_to_lose`、`known_assets`） | 校验器直接拒绝 | 它们属于另一个框架，留在契约里会诱导模型把画法写进内容层 |
| 契约里 craft 的字段名（`screenIntent`、`visualModel`、`modelStructure`、`onScreenTextRule`、`states`、`animation`、`layout`（顶层）…） | 校验器直接拒绝 | 这些名字归 `video-craft` 的分组步骤；名字在家里重复一次，就会有人以为内容契约也能写它们。名单**只住在校验器里**，契约文档不复述 |
| story 时代的两份实现（各存一份 Stage、Reference、脚本、审阅页） | 已合并成一份 | 同一份实现留两处，是这次合并要修的根因；同名文件跨 Skill 的重复已经清零 |

## 8. 改完之后问自己

```text
□ 一个没参与设计的人，只看 SKILL.md，能不能说出整条流程有哪几步、每步产出什么、什么算做完？
□ 每个 module 的作用、接口和「不做什么」，能不能在 Skill 里读到（而不是只在某次讨论里）？
□ 跨 module／跨 Skill 的缝，能不能读到「谁交出什么、谁消费什么」？
□ 一条新 gotcha 该记在哪、一次优化该动哪个 module，能不能读到？
```

删除测试，改完顺手过一遍：

```text
□ 有没有 module 删掉之后复杂度只是搬家？→ 它本来就不该存在
□ 有没有同一件事被写了两遍？→ 合成一处，其余留指针
□ 有没有必经步骤没被写成可见的 Stage，也没有任何东西检查它？→ 隐形步骤
□ 有没有 Contract／Script／Reference 在运行路径上没有消费者？
```
