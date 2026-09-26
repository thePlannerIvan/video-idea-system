# 维护记录：已经发生的升级

这份文件记**已经决定的升级**：做了什么、为什么、影响了哪些 module、删了什么。候选不在这里，在 `GOTCHAS.md`；模块边界在 `references/architecture.md`。

**它不是 CHANGELOG。** 本 Skill 不发版，这里只记模块边界、流程与判据的变化——也就是「改它的人会读到的地方」变了什么。运行日志、一次性的项目过程不进这里。

写法：**新的一次记在最上面**；每条至少写清「影响的 module」与「删了什么」。只增加、没有删除时，要说明为什么旧内容里没有失效项——不能用"保留以防万一"代替判断。

---

## 2026-09-26 · `script_hash` 口径统一：两处各核一遍

**做了什么**：定下裁决——**交接包就是上游的 `deliverable/` 目录本身，不是暂存副本**；`script.md` 与 `visual-plan.json` 同在该目录里，所以做画面那一步与剪辑那一步**都够得着它、都核，各管自己那一段**。三处文档随之对齐：`references/downstream-handoff.md` 的「版本闸门」（写明做画面那一步不符就拦下、**那一次还来得及**；剪辑那一次**只能事后发现**）、`references/visual-plan-contract.md` 的 `script_hash` 行、以及 `references/architecture.md`（§3 的两条缝 + 「相邻 Skill 的架构文档」两格）。同时把「口播不进做画面那一步」这句在架构文档里写清：它说的是**内容**（不拿口播判断画面该画什么），不是"够不着那个文件"。

**为什么**：这条口径先后改过两次，前两次只同步了交接文档，没同步后来才写的架构文档，于是有过「做画面那一步核不了」与「它也核」两种说法并存。要保住的能力是**来得及的那一次核对**：工序是「做好画面 → 录人声 → 剪」，作者是**对着画面录**的；等剪辑接手才发现脚本漂移，人已经录完了。

**影响的 module**：`references/architecture.md`、`references/downstream-handoff.md`、`references/visual-plan-contract.md`、`GOTCHAS.md`（G-10 由「候选」转为「已失效」——前一处重复已改成指针）。

**删了什么**：删掉「做画面那一步拿不到 `script.md`、核不了」这一说法（架构文档两处 + 相邻 Skill 表两格）。没有删除任何文件；`GOTCHAS.md` 的 G-10 按规则标为已失效、不删。

**验证**：`node evals/run-validator-cases.mjs` 全绿；全 Skill 内 `grep script_hash` 只剩一个口径（交接文档的「版本闸门」表 + 契约那一行 + 本记录）。

## 2026-09-26 · 迭代落点：架构、候选池、维护记录

**做了什么**：新增 `references/architecture.md`（模块表、缝与适配器、两个真相源、改动的后果、退役清单）、`GOTCHAS.md`（候选池：现象／原因／行为修正／证据／状态／所属 module）、本文件；`SKILL.md` 加「运行后迭代」指针，只指路、不复述规则。

**为什么**：设计阶段谈出来的模块划分、边界和上下游配合如果只留在对话里，下一个改它的人不在场——他会看到一堆文件和规则，看不出哪块负责什么、动了会牵连谁。真实使用中的问题也需要一个稳定落点：候选会合并、会失效，需要能批量审阅；升级是已决定的事实，需要能回溯，两者混在一起生命周期会互相污染。

**影响的 module**：`SKILL.md`、`references/architecture.md`（新）、`GOTCHAS.md`（新）、`references/maintenance-history.md`（新）。

**删了什么**：`SKILL.md` 里两句与迭代规则重复的话（「每次运行后做 Gotcha 自检……」与「通用规则只在用户明确纠正或多次真实使用支持后批量调整……」）——这两条规则现在只有一个出处，SKILL.md 只留指针。没有删除任何文件。

**验证**：`node evals/run-validator-cases.mjs` 全绿；`scripts/check-handoff-artifacts.mjs` 对没有契约的项目仍正常返回。

## 2026-09-26 · 整条流程写进 SKILL.md，漏步变得看得见

**做了什么**：`SKILL.md` 开门换成十步全景表（每步的主要产物 + 做完的标志）；路由表 front-load 触发词、删掉与全景重复的同义分支；六个 Stage 文档按 stage 结构补齐十节，完成标准拆成「语义完成／机器检查／不能由 Validator 证明」；52 方法发散成为第 3 步并点名三样产物；新增「跳过的步骤要留痕」与交接前的产物核对；新增 `scripts/check-handoff-artifacts.mjs`；硬边界补第 11 条（发散的痕迹要落盘）。

**为什么**：一轮真实运行的逐条对账里，13 条写明的步骤有 8 条该做而没做，而这 8 条在整份报告里没有单独出现过——「未触及」的漏步，读者无从知道它漏了。其中最重的一条是 52 方法发散引擎：它是 Skill 自称的核心机制，却既不是可见步骤，也没有任何闸门在结尾回头核对它是否发生。

**影响的 module**：`SKILL.md`、`stages/01`–`stages/05`（含 `04b`）、`scripts/check-handoff-artifacts.mjs`（新）、`evals/run-validator-cases.mjs`（新增 Part 3）、`evals/runbook.md`、`evals/evals.json`。

**删了什么**：`SKILL.md` 的「阶段路由」列表（与全景表重复的同义分支）。没有文件被删除。

**验证**：回归测试三部分全绿（Part 3 断言六个 Stage 都有完整结构、52 方法是具名步骤、四条契约裁定写在实现里）；对报告里那个项目跑核对脚本 exit 3，逐条点名四个缺失的具名产物。

## 2026-09-26 · 契约与交接的四处口径，加上指纹改内容哈希

**做了什么**：契约写明「文字：」是标记（下游在边界剥掉）、`sample.assets[].label` 是审阅页图注（不上屏）、`exact_labels` 与 `must_show` 各自独立、`deliverable/assets/` 由 Step 4B 产出且恰好等于契约引用；审阅页加「图注」徽标与作废横幅；`scripts/start-read-aloud-review.mjs` 的素材指纹改成内容哈希、反馈作废改成会说话（stderr + 启动 JSON + 页面横幅 + 保存回传）；交接文档两处措辞改正（风格来自 `video-craft` 的风格库而不是模板库；技术约束改成视频画面自己的）。

**为什么**：这四处各有实测证据（见 `GOTCHAS.md` 的 G-03 至 G-06 与 G-09）。指纹只按「路径:字节数」会让等长换图静默通过；静默作废会让作者只看到页面上的意见消失，不知道发生过什么。

**影响的 module**：`references/visual-plan-contract.md`、`references/downstream-handoff.md`、`assets/read-aloud-review.html`、`scripts/start-read-aloud-review.mjs`、`stages/05-read-aloud-review-and-handoff.md`、`evals/run-validator-cases.mjs`（Part 3）、`evals/runbook.md`。

**删了什么**：指纹里的文件大小算法（换成内容哈希）；静默作废这一行为（换成会提示的作废）。没有文件被删除。

**验证**：造一张与原图同为 532716 字节、内容不同的图替换后重跑，`source_hash` 改变；写入 Hash 过期的反馈后重跑，stderr、页面横幅、保存回传三处都出现作废说明，备份内容与原文件逐字段一致；回归全绿。

## 更早的一轮重构 · story 并入 idea（日期未落在仓库记录里）

**做了什么**：把原 story Skill 的全部能力并进本 Skill——资料理解与内容工作记忆、Story Battle 与 story-lock、口播 Storyline、可录口播稿、上屏文字的内容契约、同屏念稿审阅、制作说明与交接；11 个 module 并过来；两份并行的 5.0 契约收敛成一份；三处两边口径不一的地方按作者裁定统一（没有上屏文字的屏合法、一 Beat 一屏且一屏不做多状态、样张只用真素材），每条都用 eval 用例钉住；原 Skill 只留转发壳（一份 `SKILL.md` + `agents/openai.yaml`）。合并后，同一份内容在两处各存一份的情况收敛到 0。

**为什么**：同一份实现留两处，改一处漏一处；两份并行的契约让下游不知道该读哪一份；两边口径不一致时，失败会以「另一半没改」的形式出现。

**影响的 module**：本 Skill 的 `SKILL.md`、`stages/`、`references/`、`scripts/`、`assets/`、`evals/` 全部。`references/交给Craft.md`、`references/downstream-handoff.md`、`references/visual-plan-contract.md` 都在这一轮定型。

**删了什么**：原 Skill 侧的 `scripts/`、`references/`、`stages/`、`assets/`、`evals/` 副本（那一次是有意删除重复实现，不是清理）；契约里旧的框架字段（`viewer_should_understand`、`information_to_show` 一类），此后校验器直接拒绝它们。

**没动的**：历史 Story 项目的产物路径（`.video-story/…`、`deliverable/…`）**保持原样**。路径是跨会话的契约，改名会让已存在的项目目录、审阅页与反馈全部失配；原 Skill 的转发壳也保留，让旧的调用名能找到正确的落点（理由见 `references/architecture.md` 的退役一节）。

**验证**：eval 用例覆盖三处裁定；本机核对原 Skill 目录里只剩两个转发声明文件。
