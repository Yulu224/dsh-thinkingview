# dsh-thinkingview | 轻量化QoL插件

本插件在DSH输入栏下方的**模型选择**左侧新增了快速选择**思考强度**的快捷选择栏。点击可快速切换，无需打开二级菜单，提高工作效率。

> 兼容性：在 DSH 桌面版 **0.2.1-rc.2** 可运行

## 效果

![效果](./screenshot.png)

- 插件运行时从当前模型适配器公布的 `reasoning.efforts` 读取思考档位，理论可适配不同模型；
- 与官方二级菜单内的思考挡位保持同步；
- 模型无档位时，整排按钮自动隐藏。

## 已知问题

- 切换时会出现几个像素点的横移。
- 部分插件的安装卸载过程可能会导致本插件的 GUI 界面暂时失效，重启即可。

## 安装 / 卸载

不发布到 npm。两种装法任选其一。

### 方式一：直接从 GitHub 安装（推荐）

```powershell
# <DSH 安装目录> = DeepSeek Harness 的安装位置，dsh.cmd 在其 resources\runtime\cli\bin\ 下
& '<DSH 安装目录>\resources\runtime\cli\bin\dsh.cmd' plugin --profile desktop add github:Yulu224/dsh-thinkingview
```

### 方式二：clone 后挂载本地目录

```powershell
git clone https://github.com/Yulu224/dsh-thinkingview.git
& '<DSH 安装目录>\resources\runtime\cli\bin\dsh.cmd' plugin --profile desktop add '<克隆目录>'
```

### 卸载

```powershell
& '<DSH 安装目录>\resources\runtime\cli\bin\dsh.cmd' plugin --profile desktop remove dsh-thinkingview
```
