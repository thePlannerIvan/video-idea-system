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
