# dsh-thinkingview

在 DSH 桌面端输入框的工具栏里，紧跟 `DeepSeek-V41-Flash <档位> ⌄` 那颗官方 chip **左边**，加一排**思考强度直达按钮**，点一下即切，不用再点开官方两级菜单。

> 兼容性：在 DSH 桌面版 **0.2.0-rc.2**（Electron 桌面 profile）实测通过，客户端内核 `@deepseek-ai/cordis ~4.0.4`。
> 其他版本未逐一验证，若档位按钮不出现，多半是模型适配器没公布 `reasoning.efforts`。

<!-- TODO: 这里放一张截图或 GIF，例如 ![效果](./screenshot.png) -->

## 效果

```
[+] [🔒 完全权限 ⌄]        ( Off | Low | High | Max )   DeepSeek-V41-Flash High ⌄   [⬆]
                            └──── 本插件 ────┘           └──── 官方 model chip ────┘
```

- 档位**不写死**：运行时从当前模型适配器公布的 `reasoning.efforts` 读，换模型自动跟着变。
- 和官方 chip **双向同步**：两边读写的是同一个 per-session `ModelDirectory`，点哪边另一边都立刻跟。
- 模型没公布任何档位时，整排按钮自动隐藏（返回 `null`）。

## 文件

| 文件 | 作用 |
|---|---|
| `package.json` | `dsh.bundle.patch` 指向补丁；`dsh.client{platform,immediately,inject}` 声明前端half |
| `cordis.patch.yml` | 把自己的 id 挂进 profile 插件树：`- insert: [- id: dsh-thinkingview, name: dsh-thinkingview]` |
| `index.js` | 宿主half，空实现（渲染全在客户端） |
| `client.js` | 前端half：注册 `window.__ModuleLoader__.load({...})`，往 `conversation.input.right` 塞组件 |

## 原理（三行版）

```js
ctx.inject(['slots', 'modelDirectories'], (scope) => {
  scope.slots.inject('conversation.input.right', () => scope.slots.register(
    { name: 'conversation.input.right', id: 'thinkingview', order: 10,
      inject: (sessionId) => { const d = models.directoryFor(sessionId); return {
        available: sessions.subagentAddress(sessionId) === undefined,
        directory: d.store, load: () => d.load(), select: (s) => d.select(s) }; } },
    ThinkingView));
});
```

组件用 `React.useSyncExternalStore(directory.subscribe, directory.getSnapshot)` 订阅，`state.groups → models → reasoning.efforts` 取出档位表，
`select({provider, model, reasoningEffort})` 提交。这套用法与官方 `@deepseek-ai/dsh-client-ui-model-selection/lib/client.js` 同构。

提交后的高亮不等服务器回合：读到 `state.pending`（官方菜单判定的同一个字段）后立刻把高亮挪到点的那档上，
选中药丸再用 `transform` 滑过去，避免"点完先愣一下"的生硬感。

## 已知取舍：切换时会有几像素横移

官方那一行的结构（`@deepseek-ai/dsh-client-ui-conversation/lib/client.js:17525`）：

```jsx
<div className="row">                       // justify-content:space-between
  <div className="tools">…</div>            // 左组：+ 号 / 权限 / 计划 / input.left
  <div className="trailing">                // margin-left:auto ← 右对齐锚点
    <div className="standardControls">      // 内容宽度，无 flex:1
      renderSlot("conversation.input.right")   // ← chip 的左边（本插件坐这）
      renderSlot("conversation.input.model")   // 官方 chip（标签宽度会变）
    </div>
    <div className="activity">
      renderSlot("conversation.input.activity") // ← chip 的右边
    </div>
    <button className="primary">发送</button>
  </div>
</div>
```

`trailing` 靠 `margin-left:auto` 贴右边，**右边是死锚、左边是活的**。我们坐在 chip 左边，
所以 chip 标签一变宽（`Off` → `High`，且 `Off` 往往连后缀都不显示），整块会被顶着横移几像素。

搬到 `conversation.input.activity`（chip 右边）可以对调这个现象——**位置钉死，改由 chip 自己伸缩**。
2026-10-13 试过并已回退，原因记在这里备查：

- `input.activity` 是 **single** 槽。官方把它留给 `@deepseek-ai/dsh-experimental-client-ui-voice-input`
  （语音输入；本机未安装，`cordis.yml` 里没有任何 `voice` 条目）。将来启用语音输入会争这个槽。
- 该座位会额外传入 `{ locked, onActiveChange }`，其中 `onActiveChange(true)` 会把整条工具栏让给占位者
  （官方 chip 会被 `hidden` 掉）。不调用它才是安静的固定座位。

要重新试只需把 `client.js` 里两处 `conversation.input.right` 改回 `conversation.input.activity`。

## 安装 / 卸载

这是一个**本地插件**，不发布到 npm，用 `link:` 方式挂目录安装，所以改代码即时生效。

桌面 profile 被 Electron 独占，**npm 上的 `dsh` CLI 改不了它**（会报 `profile "desktop" is managed exclusively by the Electron application`）。
必须用 DSH 自带的启动器，它内部会带上 `manageDesktopProfile: true` 绕过守卫：

```powershell
# <DSH 安装目录> = DeepSeek Harness 的安装位置；dsh.cmd 在其 resources\runtime\cli\bin\ 下
# <插件目录>     = 本仓库 clone 下来后的根目录

# 安装（用 link: 挂本地目录，改代码即时生效）
& '<DSH 安装目录>\resources\runtime\cli\bin\dsh.cmd' plugin --profile desktop add '<插件目录>'

# 卸载
& '<DSH 安装目录>\resources\runtime\cli\bin\dsh.cmd' plugin --profile desktop remove dsh-thinkingview
```

`add` 会自动把包名同时写进 profile 的 `dependencies` **和** `dsh.profile.bundles`，不用手改配置。
装完到 DSH 窗口按 `Ctrl+Shift+R` 硬刷新（这是打包版应用，客户端产物不走热重载）。

改 `client.js` 后**请重启应用**，只按 `Ctrl+Shift+R` 不够——原因见下面一节。
改 `package.json` / `cordis.patch.yml` 也要重装或重启。

## 改代码会连累 dsh-theme-tarkov（2026-10-13 实测）

编辑这个包的 `client.js` 会触发 DSH 的客户端热重挂载。**本插件自己没事**（`ctx.effect` 每次挂载都重新创建并 append 样式），
但会让 **dsh-theme-tarkov 丢掉全部皮肤**：Beta 横幅变成一行裸文本、设置卡片溢出错位、整个应用从深色退回浅色。

根因在塔科夫那边，它把每个样式表都写成「模块级变量 + 提前返回」：

```
dsh-theme-tarkov/lib/client.js:379    if (BGM_CSS !== null) return;
dsh-theme-tarkov/lib/client.js:575    if (BANNER_CSS !== null) return;
dsh-theme-tarkov/lib/client.js:769    if (BG_CSS !== null) return;
dsh-theme-tarkov/lib/client.js:1053   if (PET_CSS !== null) return;
dsh-theme-tarkov/lib/client.js:1350   if (TARKOV_SETTINGS_CSS !== null) return;
```

变量在模块作用域里。热重挂载时上一次的 `<style>` 已被 effect 清理删掉，变量却还非空 → 提前返回 → 样式再也回不来，
而 DOM 节点（横幅、卡片）因为 `document.body.contains()` 之类的存活检查仍在。指纹就是「**DOM 在、CSS 没了**」。

**恢复：完全退出应用再打开**（模块变量需要重新求值）。

## 回滚

安装会改动 profile 目录下的几个文件。建议装前先备份 `package.json`、`pnpm-lock.yaml`、`cordis.patch.yml`
三个文件（profile 目录位置见 DSH 文档），出问题覆盖回去并重启应用即可。

## 已验证

- `node --check` 通过；manifest 与官方 `templates/decoration/package.json` 逐字段一致。
- 桌面 GUI 实测：按钮出现，显示 **Off / Low / High / Max**（即适配器真正公布的四档）；
  点其中一档，官方 chip 文本同步跟随（双向）。

> 插件开发参考：DSH 官方 cordis 插件开发文档（`SKILL.md` 与 `references/` 下的 UI 插件、验证相关章节，
> 以及 `templates/decoration/` 示例）。

## 改名记录

- 2026-10-17：由 `dsh-effort-quick` 全量改名为 **`dsh-thinkingview`** —— 覆盖包名、`cordis.patch.yml` 的 `id`/`name`、
  `client.js` 的 `__ModuleLoader__.load({ id })`、样式注册 id（`dsh-thinkingview: styles`）、槽位贡献 id（`thinkingview`）、
  CSS 类前缀（`.eq-*` → `.tv-*`）、组件名（`EffortQuick` → `ThinkingView`）、DOM 属性（`data-thinkingview` / `data-dsh-thinkingview`）与目录名。
- 本仓库根目录即插件目录。
- **硬约束**：`client.js` 的 `id` 必须与 `package.json` 的 `name` 逐字一致，否则客户端模块系统会抛
  `client-modules: bundle <url> loaded without registering "<id>" via __ModuleLoader__.load`。
