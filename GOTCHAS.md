# Gotchas：候选池

这里只装**候选**——有证据的、会稳定导致错误的具体行为。已经落地的升级记在 `references/maintenance-history.md`；模块边界与缝在 `references/architecture.md`。三者分工见架构文档。

**每条写六样**：现象／原因／行为修正／证据／状态／属于哪个 module。

- 状态只有四个值：**候选 · 已复现 · 已升级 · 已失效**。
- 追加前先合并同义候选；跑一次就过、只改措辞、或与现有条目同义的不写。
- **没有证据的不写**——"我觉得可能会"不是候选。
- 优化时**按 module 聚类**，不按发生次数堆规则：先定这条根因落在哪个 module，再改那一层。改错层，问题会换个地方复发。
- 已升级的条目**留着不删**：它同时是「这条已经改过、别再改一遍」的路标。设计再次变化时标成「已失效」，也不删——失效本身是要被看到的。

---

## G-01 自称核心的机制可以整步不发生，流程结尾没有任何地方回核

- **现象**：`video-idea-system` 的 description 自称核心是「用 52 个方法大量发散」，而一轮真实运行里这一步**一步没走**：`draw-cards.py` 的 `index`／`plan`／`show`／`cases` 全没跑，`_idea/method-history.json`、`_idea/ideas.json`、`_idea/web/` 都不存在。与此同时交付五件齐、审阅页开了、契约校验绿、下游 8 屏过检——**没有任何闸门问过「发散做了吗」**。
- **原因**：发散当时只是「决定记录」底下的一个子条目（`↳ 发散与轮换`），既不是可见的步骤，也没有完成标准；流程结尾没有任何回头核对。
- **行为修正**：发散写成整条流程的第 3 步并点名三样产物；任何必经步骤被跳过时，在 `_idea/current.md` 写一行「跳过 <步骤名>：<为什么>」；硬边界补第 11 条（痕迹要落盘）；交接前用 `scripts/check-handoff-artifacts.mjs` 核对具名产物。
- **证据**：`05-VideoProject/06-测试-Vans-20260926/_测试报告.md` §7.1 #7（一步没走）与 §7.5（8 条净增里最重的一条）。
- **状态**：已升级（2026-09-26）
- **module**：`SKILL.md`（触发面与路由）、`references/发散引擎.md`、`scripts/check-handoff-artifacts.mjs`

## G-02 有明确文件名的必经产物，在不在没人知道

- **现象**：`.video-story/story-lock.md`、`_idea/method-history.json`、`_idea/ideas.json`、`_idea/web/` 四样在整个项目里不存在，而交付清单、审阅页、校验器都不看它们；事后只有靠人读报告才知道漏了。
- **原因**：这些文件只在文档里被"要求"，运行路径上没有任何东西去读或检查；审阅页只读 `script.md` 与契约，校验器只读契约。
- **行为修正**：`scripts/check-handoff-artifacts.mjs` 在交接前核对这四样加 `_idea/current.md`（目录里一个文件都没有算没产出）；缺项逐条报出，由人拿去问作者是跳过还是漏了，跳过就记进 `current.md`。
- **证据**：同 G-01 的报告 §7.5（"检查它们的成本几乎为零"）。本机实测：对那个项目跑该脚本 exit 3，逐条点名四个产物；`deliverable/assets/` 与契约引用全等，未被误报。
- **状态**：已升级（2026-09-26）
- **module**：`scripts/check-handoff-artifacts.mjs`、`stages/05-read-aloud-review-and-handoff.md`
- **与 G-01 同根因**（必经步骤没有可见落点与检查），优化时按同一组 module 一起看。

## G-03 审阅页的图注被当成上屏文字

- **现象**：审阅页把 `sample.assets[].label` 画成素材框下沿看得见的字；一屏 `must_show: []`、`captions: []` 的无文字屏因此看起来"已经有字了"。而内容契约不把它当上屏文字、剪辑侧的字闸门不读它、做画面那一步只把它写进备注——**一条没有 owner 的字**。
- **原因**：契约原来只写「这一格在页面上显示什么名字」，没写它是审阅辅助还是画面文字；审阅页的渲染与三处下游的读法各说各话。
- **行为修正**：契约把 `label` 定性为**审阅页的图注，不是上屏文字**；审阅页给它加「图注」徽标、与上屏文字视觉区分；交接写明不把它画上屏。
- **证据**：报告 P-07（330–353 行）与 `.probe/beat-01.png`。
- **状态**：已升级（2026-09-26）
- **module**：`references/visual-plan-contract.md`、`assets/read-aloud-review.html`、`references/downstream-handoff.md`

## G-04 「文字：」是标记，却被当正文交给下游

- **现象**：以「文字：」开头的 `must_show` 条目原样进了下游的正文，标记留在里面——一个照抄的消费者会把「文字：」画上屏。
- **原因**：契约只写了"以「文字：」开头的条目是正文"，没说这个前缀是**标记**、在边界处要剥掉；下游也没有剥它的理由。
- **行为修正**：契约写明「文字：」是契约的标记、不是正文的字符：做画面那一步写字时剥掉前缀、字闸门比对时先剥再比；交接规则里同样写明。剥的动作归下游。
- **证据**：报告 P-11（291–310 行）里下游正文的实际内容。
- **状态**：已升级（2026-09-26）
- **module**：`references/visual-plan-contract.md`、`references/downstream-handoff.md`

## G-05 素材指纹按「路径:字节数」，等长换图指纹不变

- **现象**：素材指纹只含路径与文件大小；换一张字节数恰好相同的图，`source_hash` 不变、旧反馈继续生效——剪辑拿着已经过时的意见往下做。
- **原因**：指纹取的是最便宜的 stat 信息，不是内容。
- **行为修正**：改成**内容哈希**（分块读取，内存有界）；`script.md`、`visual-plan.json`、每张样张素材三者任一变化都会换指纹。
- **证据**：报告 P-09（233–246 行）。本机实测：造一张与原图同为 532716 字节、内容不同的图替换后重跑，`source_hash` 由 `df97e6c2…` 变为 `f9837c8f…`。
- **状态**：已升级（2026-09-26）
- **module**：`scripts/start-read-aloud-review.mjs`

## G-06 反馈作废是静默的

- **现象**：稿子或素材一换，旧反馈被复制成 `feedback.previous.json`，当轮不报错、不提示；作者只发现页面上的意见没了，不知道发生过什么。
- **原因**：作废发生在写文件的路径上，没有把这件事说给人听。
- **行为修正**：作废时在 stderr 打印原因与备份路径；启动 JSON 带 `invalidated_feedback`；页面顶部显示横幅（写明原因、上一轮保存时间、备份到哪个文件）；保存接口也回传这次作废。
- **证据**：报告 P-09 后半段。本机实测：写入一份 Hash 过期的 `feedback.json` 后重跑，stderr 打印作废原因、页面 DOM 里横幅 `data-show="1"`、`POST /api/feedback` 返回 `invalidated`，备份内容与原文件逐字段一致。
- **状态**：已升级（2026-09-26）
- **module**：`scripts/start-read-aloud-review.mjs`、`assets/read-aloud-review.html`

## G-07 真实样本的路径失效后没人知道

- **现象**：`evals/runbook.md` 的真实数据用例指向一个已经不存在的目录（`07-SkillLab/AI能力体系与职场定位` 已不在原位），照跑得到 `Invalid JSON: ENOENT`；而读者会以为样本一直是那个，甚至去追那个旧路径。
- **原因**：runbook 只给了路径，没交代样本的来处、更换历史与挑选标准。
- **行为修正**：换成工作区里真实存在、`errors`／`warnings` 全空的一份契约，并写明「样本为什么是它」：旧路径别再去追，为什么换成这一份。
- **证据**：本机实测旧路径 `ENOENT`；新样本 `ok: true`、`screens: 10`、`samples: 10`。
- **状态**：已升级（2026-09-26）
- **module**：`evals/runbook.md`

## G-08 读不了图时，用 grep 模板源码冒充「看过渲染结果」

- **现象**：审阅页是渲染出来的，DOM 由 JS 生成；只读模板源码或 grep 模板看不到真实 DOM 里到底有什么（图注徽标、作废横幅这类渲染后才存在的东西），于是"检查通过"，而页面实际不是那样。
- **原因**：缺一条「读不了图时怎么验证渲染结果」的固定做法。
- **行为修正**：用无头浏览器把页面跑起来、导出**渲染后的 DOM**（`--dump-dom`，必须给 `--user-data-dir`，导出完 kill 进程），再在 DOM 上核对；能读图时仍以看图为准。
- **证据**：本机实测用该做法确认了图注徽标与作废横幅真实存在（DOM 里能看到 `<b>图注</b>` 与 `data-show="1"`）。
- **状态**：已升级（2026-09-26）
- **module**：`evals/runbook.md`

## G-09 交出去的 `assets/` 与契约引用不全等

- **现象**：本 Skill 只写"交付 `assets/`"，没写它由哪一步产出、该装几张；下游对素材目录与契约引用做全等检查——少一张它拿到缺口，多一张它被拦下来。
- **原因**：产出步骤缺失：文档写了产物名，没写谁来产、产到什么程度。
- **行为修正**：Step 4B 的工作顺序里写明「把 `sample.assets[]` 用到的真实文件放成 `deliverable/assets/<文件名>`，恰好是契约引用的那几张」；契约与交接两侧都写明；`check-handoff-artifacts.mjs` 用集合比对做机器检查。
- **证据**：报告 P-02 与 §8 对「每张都必须被引用」这条规则的复述；旧 `downstream-handoff.md` 的那一行只有 `assets/` 一个词。
- **状态**：已升级（2026-09-26）
- **module**：`stages/04b-screen-content-and-sample.md`、`references/visual-plan-contract.md`、`references/downstream-handoff.md`、`scripts/check-handoff-artifacts.mjs`

## G-10 同一条裁定在交接文档里有两个出处

- **现象**：`references/downstream-handoff.md` 里"谁核 `script_hash`"这件事写了两遍——一处紧贴「照声明的画，不判断声明。」，一处是独立的「版本闸门」小节。结论一致，但以后改口径要改两处，很容易只改一处。
- **原因**：两个人在同一轮里各写了一次，彼此都不知道对方也写了。
- **行为修正**：合成一处——前一处改成一行指针（「`script_hash` 的核对责任见下面『版本闸门』一节」），事实只住在「版本闸门」那张表里。
- **证据**：该文件同一轮改动里出现的两处表述；作者在下一轮把前一处改成了指针，并把口径统一为「两个下游都够得着 `script.md`，都核，各管自己那一段」。
- **状态**：**已失效**（2026-09-26，已按上面的修法合并）。留着不删，是为了记住这一类——同一条事实写两遍，改一次口径就会漏一处。
- **module**：`references/downstream-handoff.md`

## 资料清单不给未读文件算哈希

- **现象**：`inventory-sources.mjs` 只登记「目录里有什么」，这个项目的资料常是几 GB 的视频与音频。如果按契约里其他产出方的做法给每条来源算 sha256，光登记一步就要把整个素材库读一遍。
- **原因**：哈希是「这条来源没变过」的凭据，价值在**读过并引用之后**；对一条还没读的文件，它买不到什么。
- **行为修正**：发现式清单里每条都是 `coverage.status: unread` + `origin.sha256: null`（契约明确允许）；**读完一项就把它改成 `full` 并补 `sha256` 与 `role`**。顶部留一条全局 `blind_spots`，告诉下游「这份清单只证明发现了文件」。
- **证据**：契约修正与冒烟测试见 `.scratch/planner-skill-decomposition/development-plan.md` §6；`/tmp/vis-smoke` 用 3 个文件跑出 0 警告。
- **状态**：已落地（契约 + 脚本）。
- **module**：`scripts/inventory-sources.mjs`

## G-11 不透明源 iframe 里顶层读本地存储，让整页脚本当场死掉（零报错）

- **现象**（2026-09-26，用户在 DSH 侧栏看到**空白**的念稿审阅页）：静态骨架在（页头、说明、「整条视频」那一节都在），
  但逐段那一半（`#beatnav` / `#beats` 由 JS 现场建）**永远是空的**，控制台**没有任何报错**。
- **原因**（同协议父帧 harness 一次跑出来）：有插件时页面在 `sandbox="allow-scripts"` 的不透明源 iframe 里，
  `localStorage` **一读就抛 SecurityError**。而这一页的 `fontSize` 初始化是**顶层语句**：
  `let timer=null,fontSize=Number(localStorage.getItem('video-story-reading-size')||25);`
  → 脚本在第二行就死，后面所有渲染都不执行。审阅桥的 docstring 专门交代过"不碰 localStorage/sessionStorage
  （不透明源下会抛）"，页面自己却破了这条。
- **行为修正**：① 本地存储一律走 `storeGet/storeSet/storeRemove`（`try{window.localStorage}catch{return null}`），
  拿不到就降级（草稿与字号只是便利，不是承诺）；② **渲染不许挂在握手/网络/任何外部依赖上** ——
  先用自带数据画出来，再去连桥，而且 `connect()` 带 1.5s 上限；③ 连不上时页面**说出来**（"本页只读"）。
- **证据**：`.scratch/video-idea-seam/tools/plugin_handshake_harness.py`
  修前（init 模式）：`pageerror: Failed to read the 'localStorage' property … sandboxed and lacks 'allow-same-origin'`，
  `#beats` 0 项；修后（init）：`helloSeen=1 initSent=1`，`#beats` 10、`#beatnav` 10、写反馈+唤醒都到宿主；
  修后（no-init，握手永不返回）：`#beats` 10 且状态行写「连不上审阅宿主（握手超时）…」。
  套件里的判据：`evals/run-validator-cases.mjs` Part 4 的"页面必须能没有桥也把自己画出来"（在 node vm 里跑页面脚本、
  DOM 用记账桩、localStorage 一碰就抛）+ 反面对照。
- **状态**：已升级（2026-09-26），三条判据 + 两条反面对照进套件。
- **module**：`assets/read-aloud-review.html`（页面自身）；顺带把同款"渲染挂在握手上"也修进了 planners-bypage 的审阅页。
