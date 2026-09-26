# 自检与回归测试

这个目录里的东西怎么跑，以及它们各自在证明什么。**改动本 Skill 的任何文档、契约、校验器或审阅页之后都要重跑一遍。**

## 1. 回归测试（推荐先跑这个）

```bash
node evals/run-validator-cases.mjs
```

三部分：

- **Part 1** 用 `evals/cases/` 里的固定样本跑 `scripts/validate-visual-plan.mjs`，断言退出码与关键错误串。`ok-*` 必须退出 0，`bad-*` 必须退出 3 并给出对应错误。
- **Part 2** 断言几条裁定真的写在实现里（文档也算实现），并且契约文档没有变成 craft 语汇的第二个家。
- **Part 3** 断言整条流程看得见：`SKILL.md` 开门的全景与漏步留痕规则、六个 stage 文档都按 stage 结构写全（含语义／机器／不能由 Validator 证明三段完成标准）、52 方法发散是一等步骤、四条契约裁定（图注、`文字：` 标记、`exact_labels` 独立、`assets/` 产出步骤）、以及内容哈希指纹与作废提示。

退出码 0 表示全过，1 表示有断言失败。**不要为了让测试变绿去放宽断言**——断言就是裁定的落地位置。

### 固定样本覆盖的裁定

| 样本 | 期望 | 覆盖的裁定 |
|---|---|---|
| `ok-text-free-picture-only.json` | exit 0 | 没有任何上屏文字的屏合法：`must_show` 可以是空数组，用 `sample.assets[]` 声明那一张图 |
| `ok-omitted-captions-key.json` | exit 0 | `sample.captions` 是可省字段，整个键不写也合法 |
| `ok-caption-only-text-screen.json` | exit 0 | `layout: "text"` 的屏可以既没有素材也没有 `assets` 键，只有花字 |
| `bad-two-screens-one-beat.json` | exit 3 | 一 Beat 一屏：同一 `beat_id` 不得出现两次 |
| `bad-empty-screen.json` | exit 3 | 每一屏都要在审阅页上显示出点什么（`must_show` / `sample.assets` / `sample.captions` 至少一个非空） |
| `bad-material-free-sample.json` | exit 3 | 样张只用真素材：非 `text` 布局必须声明真实素材，标注过的概念示意不算样张 |
| `bad-craft-owned-field.json` | exit 3 | 契约屏级不得出现 craft 分组步骤的字段名（`visualModel`） |
| `bad-states-field.json` | exit 3 | 一屏不得声明多个状态；着重动画不是契约状态 |

## 2. 真实计划上的校验

`05-VideoProject/Skill 全集/deliverable/visual-plan.json` 是工作区里真实存在的一份契约（10 屏，10 张样张）。改动校验器或契约后用它做一次端到端确认：

```bash
node scripts/validate-visual-plan.mjs \
  "<工作区>/05-VideoProject/Skill 全集/deliverable/visual-plan.json" \
  --script "<工作区>/05-VideoProject/Skill 全集/deliverable/script.md"
```

期望：`ok: true`、`screens: 10`、`samples: 10`、`errors` 与 `warnings` 都为空、退出码 0。注意 `node` 不在默认 PATH 时要用完整路径（本机为 `~/.nvm/versions/node/v22.22.2/bin/node`）。

**样本为什么是它**：这一位置原来放 `07-SkillLab/AI能力体系与职场定位/deliverable/visual-plan.json`，那个目录已不在原位（`07-SkillLab` 正在从 OneDrive 恢复），旧路径别再去追。换用 `Skill 全集` 是因为它屏数与样张齐全、`errors`/`warnings` 全空，能一次撞出真实数据上的问题。

## 3. 审阅页端到端

审阅页的两条硬要求（每一屏都显示得出东西、没有样张的屏也保留内容契约）要看真实页面，不能只看代码：

```bash
node scripts/start-read-aloud-review.mjs \
  --script "<项目>/deliverable/script.md" \
  --visual-plan "<项目>/deliverable/visual-plan.json" \
  --review-dir "<项目>/_idea/reviews/script" \
  --asset-root "<素材根>" --port 0 --no-open
```

脚本会打印一行 JSON（含 `url`、`screens` 数量、`invalidated_feedback`、`prior_round_flagged_beats`）并写出
`<review-dir>/index.html` + `review-surface.json`。**页面必须由宿主 serve**（`--port 0` 那条走模组的无插件宿主；
有插件时用 `--surface-only` 把 surface 交给 `review_open`），直接开 `index.html` 文件是连不上桥的。检查：

- `screens` 等于契约里的屏数：**没有 `sample` 的屏也留在页面上**（它的内容契约仍然显示），不会再被静默丢掉；
- `index.html` 里能找到每一屏的 `screen_id` 与 `must_show` 条目；
- 一屏在 `must_show`、`sample.assets`、`sample.captions` 三者都空时，脚本 `exit 2` 并打印是哪一屏；
- `index.html` 里每一格素材的下沿带「图注」标记，页面提示写明它不上屏。

保存路径：作者在页面上保存 → 宿主落 `<review-dir>/review-submissions.json` →
`node scripts/review-inbox.mjs --surface "<review-dir>/review-surface.json"` 收件 → 写出原生 `feedback.json`
（收据里带 `review_state`：哪些段被标过、哪些段是默认通过人没碰、页面**没做**版本核对；以及
`orphaned_prior_beats`：上一轮有些意见挂的 beat_id 在本版里已不存在）。原生 `feedback.json` 的形状
（`version`/`sourceHash`/`scriptPath`/`visualPlanPath`/`savedAt`/`overallDecision`/`overallFeedback`/`beats`）一个字段没变。

**指纹与作废**（P-09）：`source_hash` 含 `script.md`、`visual-plan.json` 与每张样张素材的**内容哈希**。用一张字节数相同、内容不同的图替换样张引用的素材后重跑，`source_hash` 必须变化；此时若 `<review-dir>/feedback.json` 的 Hash 已过期，脚本会在 stderr 打印作废原因、把旧反馈复制成 `feedback.previous.json`，并在页面上显示橙色横幅。

### 模型读不了图时，怎么验证渲染结果

审阅页是渲染出来的，所以要看真实 DOM：不是猜，也不是只 grep 模板源码。当前模型没有图像输入时，用 Chrome 把页面跑起来，再把渲染后的 DOM 导出来查：

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
D=$(mktemp -d)   # 不给 --user-data-dir 时 headless 会直接报错退出
"$CHROME" --headless --disable-gpu --no-sandbox --user-data-dir="$D" \
  --virtual-time-budget=3000 --timeout=8000 --dump-dom \
  "file://<review-dir>/index.html" > /tmp/dump.html
grep -o '<figcaption><b>图注</b><span>[^<]*</span></figcaption>' /tmp/dump.html | head -3
```

跑完记得 `kill` 掉进程（`--dump-dom` 有时不自己退出）。能读图时以看图为准；`--dump-dom` 是读不了图时的替代手段。

## 4. 交接产物核对

```bash
node scripts/check-handoff-artifacts.mjs --project "<项目>"
```

检查 `.video-story/story-lock.md`、`_idea/method-history.json`、`_idea/ideas.json`、`_idea/web/` 是否存在，以及 `deliverable/assets/` 是否恰好等于 `visual-plan.json` 引用的那几张。`ok: true` 退出 0；有缺项退出 3 并逐条列出，`next` 说明拿哪一项去问作者（跳过还是漏了）。这不是第二套流程，只是一次存在性核对。

## 5. 行为测试（`evals.json`）

`evals.json` 是给执行模型跑的行为用例，不是自动化测试：给一个干净任务、只给 Skill 目录和 prompt，按 `must_do` / `must_not_do` 人工或让 Judge 核对。字段说明：

- `film_shape`：`spoken-only` 或 `spoken+pictures`——**片级形状只有这两个值**，不要用内容类型当路由；
- `screens_with_picture`：哪些 Beat 的屏带画面，用来核对屏级判断。

其中 `ruling-*` 三条是本次裁定新增的用例，与 Part 1 的固定样本一一对应。
