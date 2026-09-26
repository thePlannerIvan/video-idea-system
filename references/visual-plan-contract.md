# Visual Information Contract v5.0

`deliverable/visual-plan.json` 交给下游三样东西：**这一段口播的画面上必须出现什么信息**（内容契约）、**上屏文字与花字的声明**（`must_show` 里以「文字：」标注的条目、`exact_labels`、`sample.captions`），以及**这一屏大概是什么样**（`sample`，只用真素材拼的粗糙静态样张）。每屏恰好绑定一个 Speech Beat。样张是审阅辅助物，不是 Storyboard，也不是设计交付：契约里没有配色、字体、动效、时间轴。

## 结构

```json
{
  "contract_version": "5.0",
  "title": "视频标题",
  "script_hash": "最终 script.md 的 sha256",
  "screens": [
    {
      "screen_id": "screen-beat-03",
      "beat_id": "beat-03",
      "title": "种草蓄水，信任成交",
      "question": "为什么种草和成交不是同一件事？",
      "must_show": [
        "文字：好看是第一种草位，信任是第一成交位",
        "种草（蓄水）和转化两个概念",
        "两条失败路径：只做种草→决策时不信任→人走掉；只做转化→不认识你→进不了池子"
      ],
      "must_express": ["种草发生在前，转化发生在后"],
      "exact_labels": ["种草（蓄水）", "转化", "种草位", "成交位"],
      "evidence": ["SRC-01#p2"],
      "sample": {
        "layout": "hero",
        "thumbCols": 2,
        "note": "左边两条路径整页对照；右边四格是逐块明细截图。",
        "assets": [
          { "kind": "image", "path": "deliverable/assets/path-compare.png", "label": "两条路径对照页" },
          { "kind": "image", "path": "deliverable/assets/detail-1.png", "label": "只做种草" },
          { "kind": "image", "path": "deliverable/assets/detail-2.png", "label": "只做转化" },
          { "kind": "csv", "path": "data/users.csv", "label": "真实用户行", "columns": ["nickname", "content"], "lines": 6 }
        ],
        "captions": ["种草发生在前", "转化发生在后", "只做种草 → 人走掉", "只做转化 → 进不了池子"]
      }
    }
  ]
}
```

## 内容契约字段

| 字段 | 必填 | 说明 |
|---|---|---|
| `contract_version` | 是 | `"5.0"` |
| `title` | 是 | 视频标题 |
| `script_hash` | 是 | 最终脚本的 sha256。交接时由 `validate-visual-plan.mjs --script` 绑一次；**此后由下游在接手时复核**——`script.md` 与契约同在 `deliverable/` 里，做画面那一步和剪辑那一步都够得着，两处各核一次 |
| `screens[].screen_id` | 是 | 全局唯一且稳定，由 Beat ID 派生 |
| `screens[].beat_id` | 是 | 绑定的 Speech Beat；同一 `beat_id` 不得重复出现 |
| `screens[].title` | 是 | 本段内容标题，不是视觉模型名称 |
| `screens[].question` | 是 | 本段口播开头要回答的问题 |
| `screens[].must_show` | 是 | **画面上必须出现的内容清单**：对象、事实、数字和标签。**允许空数组**——没有任何上屏文字的屏合法；此时必须用 `sample.assets[]` 声明这一屏摆什么真实素材 |
| `screens[].must_express` | 否 | 画面必须表达的语义事实或差异；写成事实，不写成图形指令 |
| `screens[].exact_labels` | 否 | 必须原样出现的标题、指标、数字、节点或术语 |
| `screens[].evidence` | 否 | 真实数据、截图或资料来源；没有来源时不要虚构 |
| `screens[].sample` | 否 | 这一屏的粗糙样张。**有画面的屏必须给**；没有任何画面、只靠口播承担的屏可以不给，此时这一屏在审阅页上只有口播 |

## 上屏文字与花字的声明

**花字与上屏文字由本契约声明，下游只检查、不另立第二份声明。**

- `sample.captions[]` 就是**花字层**：这一屏要打的字，按出场顺序；最后一条按重点句呈现。数组中每一条绑定它要强调的那一句口播。
- `must_show` 里以 **「文字：」** 开头的条目，是不属于花字层、但必须出现在画面上的正文。**「文字：」是契约的标记，不是正文的字符**：做画面那一步在页面上写字时剥掉这个前缀，正文从它后面第一字开始；下游的画面文字闸门比对时也先剥标记再比。契约里保留标记，画面里不出现标记。
- `exact_labels` 是必须原样出现、不许改写的标题、指标、数字、节点或术语。
- `must_show` 与 `exact_labels` 是两条各自独立的声明：`exact_labels` 不要求是 `must_show` 的子集，也不从 `must_show` 自动派生；同一段字可以两处都写（一处是必须上屏的正文，一处是必须原样不改的字），也可以只写一处。本契约不要求两者互相去重或互相包含。
- 下游的画面文字闸门**读这一份文件**作为声明侧，不新建 `on_screen_text.json` 之类的第二份声明。

## 样张字段（`sample`）

| 字段 | 必填 | 说明 |
|---|---|---|
| `layout` | 是 | `hero`（一主图 + 缩略格）· `grid`（等分格）· `single`（整屏一张）· `text`（无素材，纯文字屏） |
| `assets[]` | 是（`text` 除外） | 这一屏要摆进去的真实素材。**一张图也是素材**：没有上屏文字的屏照样要在这里声明它的图片 |
| `captions[]` | 否 | 花字层：这一屏要打的字，按出场顺序；最后一条按重点句呈现。**没有上屏文字的屏就留空，不写占位** |
| `note` | 否 | 一句话说明这一屏大概长什么样，给审阅页做注脚。这里也是说明「用什么样的模型展示」的地方 |
| `cols` | 否 | `grid` 的列数，1–6 |
| `thumbCols` | 否 | `hero` 右侧缩略格的列数，1–4 |

### 素材类型（`assets[].kind`）

| kind | 放什么 | 专属字段 |
|---|---|---|
| `image` | 真实截图、页面渲染图、联系表、照片 | `mark` `zoom` `dim` |
| `csv` | 从原始数据文件里真实读出的行 | `columns` `lines` |
| `html` | 一个真实 HTML 产物（报告、看板）作为实物界面嵌入 | `viewport` |
| `glob` | 一个目录里真实存在的图集（逐页归档、批量截图） | `limit` |
| `video` | 一段真实现场录屏 / 实拍素材 | — |

| 素材字段 | 说明 |
|---|---|
| `path` | 相对素材根的真实路径；不要在契约里内联图片数据 |
| `label` | **审阅页的图注，不是上屏文字**：审阅页把它画在素材框下沿，帮作者认出这一格是什么。它不进 `must_show` / `exact_labels` / `sample.captions` 任何一层，做画面那一步不把它画上屏。审阅页要让它与上屏文字在视觉上区分得开——图注是素材框上的小字标记，上屏文字与花字是画面内的层 |
| `span` | 跨几列（`grid` 布局下用） |
| `mark` | `image` 用：`{cols, rows, index, tag}` 在联系表上框出第几格 |
| `zoom` | `image` 用：`{x, y, w, h}` 按百分比局部放大 |
| `dim` | `image` 用：压暗整屏，只留关键区域（如“读者记住的那三秒”） |
| `columns` / `lines` | `csv` 用：取哪些列、取几行 |
| `viewport` | `html` 用：`{w, h}` 截取真实产物的可视区域，默认 1000×625 |
| `limit` | `glob` 用：最多取几张，默认 12 |

## 约束

- **一 Beat 一屏**：每屏恰好绑定一个 Beat；同一 `beat_id` 不得出现两次。若一段口播需要两屏，先拆成两个 Speech Beat。
- **一屏不得声明多个状态**。状态是下游时间脊柱的分组概念，不是内容契约的字段；**着重动画在录后按实测音频加**，更不是契约状态——不要因为它把「多状态」重新加回来。
- 每一屏都必须在审阅页上**显示出点什么**：要么 `must_show` 非空，要么 `sample.assets[]` 非空，要么 `sample.captions[]` 非空。三者都空就是内容缺陷，不是「暂时没想好」。
- 内容契约是核心：`must_show`、`must_express`、`exact_labels` 和 `evidence` 决定下游必须保住什么。不要把“模型：流程图/相交圆”等图形形式写进来。
- **样张只用真素材**：静态摆放、不做动效、不指定字体配色、不追求精致。素材不存在就如实标缺口，不要补画示意图——**标注过的概念样张也不算样张**。
- **`deliverable/assets/` 在这一步产出**：拼样张时把 `sample.assets[]` 用到的真实文件放成 `deliverable/assets/<文件名>`，目录里恰好是契约引用的那几张——少一张下游会拿到缺口，多一张做画面那一步的全等检查会拦下来。契约里指向别处的路径（例如 `data/users.csv`）留在原地，不进这个目录。
- 交接前用 `node <本 Skill>/scripts/check-handoff-artifacts.mjs --project <project>` 核对 `deliverable/assets/` 与契约引用是否全等。
- 样张不是设计交付：下游可以完全重做画面；但样张暴露的内容缺口必须在契约里补上再交接。**素材选择与这一屏的简单设计是要继承的，版面不是。**
- 禁止加入 `viewer_should_understand`、`information_to_show`、`information_surplus`、`evidence_refs`、`information_not_to_lose`、`known_assets` 等旧的框架字段。
- 屏级**不承载任何画面设计或时间决定**：图形形式、版面、状态、动效、配色、字体、秒数都不属于本契约。布局只以 `sample.layout` 这一审阅用枚举出现，且只允许上面列出的四个值。（这些概念的字段名归 `video-craft` 的分组步骤所有，本契约不复述那份名单。）
- 最终交接前运行 `validate-visual-plan.mjs visual-plan.json --script script.md` 绑定脚本 Hash。

## 唯一的确认面：念稿审阅页

- **两种形状都要过，没有第二条路径**：纯口播的片和口播 + 画面的片走同一页。纯口播只是省略 `--visual-plan`。
- **这一页就用样张把画面定调到「故意简单但已经定了」的程度**：放哪张图、两张图是不是对比关系、用什么样的模型展示、模型上有什么字。粗糙可以，没定不行。
- 这一页上定下来的这四件事是**决定**，随本文件的 `sample` 落盘并被下游继承；它们不新增契约字段。

## 生产者与消费者

- 生产者：Video Idea System 的口播与画面阶段。
- 人读视图：统一审阅页一屏一组（左口播、右样张、下双反馈），以及 `visual-blueprint.md`（人读版只展示问题、必须呈现、必须表达、固定文字和证据）。
- 消费者：**Video Craft**；它负责把 Beat 绑定到实测 cue，并按这一份声明检查画面上的文字。样张的设计不可继承，素材选择与简单设计可以。
- 画面（静态 SVG）由做画面那一步在**录制之前**按本文件产出；工作顺序是：定故事与文案 → 做好静态画面 → 录人声 → 剪时间线 → 挂画面 → 按实测音频加轻动画 → 合成。
