# Video Idea System

短视频创意与内容交界的**唯一入口**：先共创核心洞察与传播目标，再用 52 个方法大量发散、自筛并分批展示创意；把主张锁成能讲的故事，写成能直接念的口播稿，逐屏产出**上屏文字与花字的内容契约**，最后在**一个念稿审阅面**上由作者念过并确认，再交接制作。

它**不执行剪辑和渲染** —— 那是 [`video-craft`](https://github.com/thePlannerIvan/video-craft) 的事。

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![Skill](https://img.shields.io/badge/skill-video--idea--system-2ea44f.svg)](#安装)
[![Review-gated](https://img.shields.io/badge/review-gated-orange.svg)](#核心工作流)

**作者：阿祖不看 TVC** · 小红书同名账号 · [demyth.info](https://demyth.info) · `Lawyif@163.com`

## 它解决什么问题

一部片最先坏掉的地方，通常不是剪辑，是**在创意还没定下来的时候就开始做**。

具体坏在这几处：

- **创意没有核心就发散。** 一次给出几十个点子，看着热闹，但没有一个能回答「这片子到底要说什么」。
- **稿子很好，但念不出来。** 书面语、长句、没有呼吸点，录音时才会发现。
- **内容和画面对不上。** 稿子里说「三个原因」，画面只给了两张图；花字写了金句，口播里根本没这句。
- **确认发生在太晚的地方。** 作者第一次完整念稿，是在已经做完画面之后 —— 那时改一句，等于重做一屏。

所以本 Skill 的顺序是**先定核心，再发散表达**，并且把**念稿审阅**做成一道真正的门：作者实际念过、存了反馈，这一步才算做完。没做这个确认，后面一步不启动。

## 核心工作流

十步。每一步的产物就是它的完成凭证 —— 没见到那个文件，那一步就没做完。

| # | 这一步做什么 | 主要产物 |
|---|---|---|
| 1 | 资料理解：读懂材料、抽声音信号、写内容工作记忆 | `.video-story/source-index.json`、`content-memory.md` |
| 2 | 洞察与目标：和作者定下核心与传播目标 | `_idea/current.md` 标 `core-v1` |
| 3 | 发散与自筛：52 方法大量发散、自筛、分批展示 | `_idea/ideas.json`、`_idea/web/创意展示.html` |
| 4 | 概念锻造：把候选锻成能执行的概念与粗结构 | `_idea/creative-intent.md` |
| 5 | 主张 Battle：逐轮提出、攻击、冻结主张 | `.video-story/story-lock.md` |
| 6 | 口播 Storyline：排成 Speech Beat，定两个轴 | `_idea/current.md` 里的屏级与片级结论 |
| 7 | 口播成稿：写成能直接念的连续口播 | `deliverable/script.md` |
| 8 | 屏的内容契约与样张：给要画面的屏定内容责任与粗糙样张 | `deliverable/visual-plan.json`、`deliverable/assets/` |
| 9 | **念稿审阅：作者念过并确认** | `_idea/reviews/script/feedback.json`、`review-submissions.json` |
| 10 | 交接：写制作说明并核对产物 | `deliverable/production-brief.md` |

**跳过的步骤要留痕。** 任何必经步骤被跳过 —— 作者授权自决、本轮不需要、上游阻塞 —— 都在 `_idea/current.md` 写一行说明。

## 适合 / 不适合

**适合**

- 有一个主题或一批资料，但**还没有想清楚要说什么**。
- 已有口播稿，但怀疑它**没有创意**、或撑不起一条片子。
- 强知识内容（案例拆解、概念解释、行业分析），需要先读懂再讲。
- 想把「每屏该出现什么文字、配哪张图」一次性说清楚，再交给制作。
- 需要**作者本人念过才算数**的确认环节。

**不适合**

- **只要剪辑、渲染、成片** —— 用 `video-craft`，本 Skill 不碰这些。
- 只想让模型**直接生成一版稿子**、不要追问和共创 —— 本 Skill 会先停在讨论，不自行假定主张。
- 想要纯文案/文章，不需要画面契约与念稿确认 —— 用写作类 Skill 更省事。
- 想要批量套模板出稿 —— 本 Skill 的每个阶段都要求作者真实决定。

## 安装

```bash
npx skills add https://github.com/thePlannerIvan/video-idea-system --skill video-idea-system
```

## 公共模组（缺了会自动装）

本 Skill 依赖若干**公共模组**（独立发布的条目，不是本仓库的一部分）：

- [`planners-review-core`](https://github.com/thePlannerIvan/planners-review-core) —— 审阅面契约、桥与本地宿主
- [`planners-source-index`](https://github.com/thePlannerIvan/planners-source-index) —— 来源索引契约与唯一校验器
- [`planners-fact-check`](https://github.com/thePlannerIvan/planners-fact-check) —— 事实核查契约与校验器
- [`planners-report-kit`](https://github.com/thePlannerIvan/planners-report-kit) —— 报告装配与校验（仅带报告出口的 Skill 需要）

某个模组不在本地时，本 Skill 的适配器会**自动从 GitHub 装它**，不需要手动准备。适配器找的地方按顺序：

1. `$PLANNERS_MODULES_HOME/<模组名>`
2. 本 Skill 的兄弟目录 `<skills-root>/<模组名>`（发布后的主路径）
3. monorepo 里 `02-skills-library/<分类>/<模组名>`
4. **用户级安装根**：`$PLANNERS_MODULES_INSTALL_DIR` → `$PLANNERS_MODULES_HOME`（仅当它已含该模组，或那目录还不存在）→ 默认 `~/.planners-modules/<模组名>`

前三条都没有时才自动安装（顺序不变，**本地永远优先、不会无条件联网**）；装到第 4 条那个**库外**用户级目录，**绝不写进** `02-skills-library` 工作树、`~/.codex|~/.claude|~/.gemini` 的技能目录、或任何系统目录。安装过程**不静默**：会打印缺哪个、找过哪些路径、从哪个 URL 装、装到哪、用的是 `git clone --depth 1` 还是 `npx skills add`、以及装到的 **commit**。装完先在暂存目录里验证（`SKILL.md` + 该模组声明的契约/校验器锚点文件都在），再用 rename 原子就位；**任何失败都会清掉暂存、不留半成品**，并给出可复制的手动安装命令。

要它**只报不装**（CI／离线／审计）：

```bash
PLANNERS_NO_AUTO_INSTALL=1 <你的命令>
```

| 环境变量 | 作用 |
|---|---|
| `PLANNERS_MODULES_HOME` | 指定已有模组所在目录（解析第 1 条，也兼作安装根） |
| `PLANNERS_MODULES_INSTALL_DIR` | 只指定**自动安装**的落点（优先级高于上面那条） |
| `PLANNERS_MODULES_REF` | 要钉的 tag 或分支（不设 = 装默认分支 HEAD） |
| `PLANNERS_NO_AUTO_INSTALL=1` | 只报不装；缺依赖时如实失败并打印手动命令 |

装的是**默认分支 HEAD**，日志里**永远打 commit**；HEAD 恰好被某个 tag 指着时，tag 也一并打出来。想钉版本就设 `PLANNERS_MODULES_REF`：

```bash
PLANNERS_MODULES_REF=v1.0.0 <你的命令>     # 钉在 tag 上
PLANNERS_MODULES_REF=main   <你的命令>     # 钉在某个分支上
```

钉了不存在的 ref 会**如实失败**（不会悄悄退回 HEAD），错误里带正确的可复制命令。

### 两条命令别搞混：谁装 Skill，谁抓依赖

**用户装一个 Skill** —— 用 Skills CLI，它会把条目放进各 agent 的技能目录：

```bash
npx skills add https://github.com/thePlannerIvan/<Skill 名> --skill <Skill 名>
```

**Skill 自己抓一个公共模组（内部依赖）** —— 用 `git clone`，落在库外的单一安装根：

```bash
git clone --depth 1 https://github.com/thePlannerIvan/<模组名>.git \
  "$HOME/.planners-modules/<模组名>"
# 想钉版本：加 --branch v1.0.0
```

**内部依赖为什么不走 `npx skills add`**：它没有 `--dir` 之类的落点参数，只会写进 `~/.claude/skills`、`~/.codex/skills` 这类 **runtime 技能目录**（那是发布器的领地，写进去等于多一份漂移副本）；而且它下载的目录**不带 `.git`**，拿不到 commit、也就没法追溯装的是哪一版。**门面命令归用户，内部依赖归 clone** —— 上面自动安装走的就是这条。

> 自动安装器自己的不变量测试（安装根优先级、禁地断言、候选顺序、幂等、失败清理、只报不装）：
> `node --test scripts/lib/planners-modules-install.test.mjs`



装到 Claude Code / Codex 的 skills 目录：

```bash
git clone https://github.com/thePlannerIvan/video-idea-system.git ~/.claude/skills/video-idea-system
```

**依赖**

- **Node.js** —— `scripts/*.mjs`（内容契约校验、收件、起审阅宿主）。
- **Python 3** —— 仅标准库（`scripts/draw-cards.py`、`compile_case_appendix.py`）。
- **[`planners-review-core`](https://github.com/thePlannerIvan/planners-review-core)** —— 审阅页宿主与桥的公共接缝。念稿审阅面通过它工作；没有它时用缝自带的本地宿主照常跑。

**本 Skill 不需要任何 API 密钥**，也不会上传你给的资料。

## 典型 prompt

```text
用 video-idea-system 帮我做一条片：
主题是「为什么大品牌的广告越来越不像广告」，我手上有一份 20 页的行业报告，
先跟我把核心洞察谈定，再发散。
```

```text
这份口播稿我觉得没创意，帮我诊断一下问题在哪，别直接重写。
```

```text
把这份资料读懂，锁一版主张，写成能直接念的稿子，
每屏告诉我该出现什么文字、配哪张图，最后起念稿审阅面让我念一遍。
```

## 目录结构

```
SKILL.md                 入口与整条流程
stages/                  10 个阶段的完整完成标准
references/              发散引擎、概念锻造、故事 Battle、口播写作、
                         内容契约、网页交付、批评清单、案例附录
scripts/                 契约校验、收件、审阅宿主启动、卡片解析
evals/                   content contract 的反例/正例与校验器用例
assets/                  念稿审阅页与创意展示页模板
agents/openai.yaml       Codex 侧的界面元数据
GOTCHAS.md               踩过的坑与它们的现场
CHANGELOG.md             变更记录
```

## 品牌与署名边界

本项目开源，但**项目名与作者身份不等于开源授权**。你可以 fork、修改、商用（AGPL-3.0 允许商业使用），但修改版必须**换名或明确标注是 fork**，不能暗示作者为你背书。完整边界见 [TRADEMARK.md](TRADEMARK.md)。

出处识别可以出现在仓库文档、流程 HTML、审阅页与验证页里，**但默认不写进最终客户交付物**。

## 开源协议和商业入口

以 **AGPL-3.0** 开源 —— 允许商业使用；保护的是**修改版与网络服务也要公开对应源码**，不保护项目名与作者身份。

需要私有部署、企业方法库适配、定制校验器、闭源商业授权或内部培训，见 [COMMERCIAL.md](COMMERCIAL.md)。

由阿祖不看 TVC 创建与维护 · https://demyth.info · Lawyif@163.com。授权和归属详见 [LICENSE](LICENSE)、[NOTICE](NOTICE)、[TRADEMARK.md](TRADEMARK.md)。安全说明见 [SECURITY.md](SECURITY.md)。
