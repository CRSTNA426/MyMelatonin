# CHANGELOG — MyMelatonin 项目优化全记录

> 从 278 行原型 → 1694 行产品级 Web 应用，逐 Phase 记录每处改动。

---

## 文件变更总览

| 文件 | 操作 | 行数变化 | 说明 |
|------|:--:|------|------|
| `index.html` | 重写 | 278 → 1694 | 核心应用，CSS + HTML + JS 三合一 |
| `.gitignore` | 新增 | +12 | Git 忽略规则 |
| `README.md` | 新增 | +155 | 项目文档 |
| `screenshots/.gitkeep` | 新增 | +1 | 截图占位目录 |
| `ASMR/*.mp3` | 不变 | — | 9 首 ASMR 音频 |
| `Natural_Noise/*.mp3` | 不变 | — | 19 首自然白噪音 |
| `CHANGELOG.md` | 新增 | — | 本文件 |

---

## Phase 1：现状诊断

**产出**：分析报告，无代码改动。

| 诊断维度 | 发现 |
|----------|------|
| 技术栈 | 纯 HTML/CSS/JS，单文件 278 行，无框架 |
| Bug | iOS iPadOS 13+ 检测失效、`location.reload()` 粗暴返回、过场动画硬编码 3.6s、`Math.random()` 可能连续重复 |
| 缺失功能 | 无进度条、无定时器、无全屏、无快捷键、无本地存储、无加载状态、无错误处理 |
| UI | 只有 emoji + 文字，配色单一 `#001524`，无过渡动效 |
| 简历就绪度 | 无 README、无 Git、无部署、无截图 |

---

## Phase 2：视觉重构

### 改动文件
- `index.html`：278 → 1217 行（重写）

### 配色系统

| CSS 变量 | 色值 | 用途 |
|----------|------|------|
| `--bg-deep` | `#0a0f1a` | 最深背景 |
| `--bg-primary` | `#0d1525` | 主背景 |
| `--bg-surface` | `rgba(255,255,255,0.03)` | 卡片/表面 |
| `--bg-hover` | `rgba(255,255,255,0.07)` | hover 状态 |
| `--accent-purple` | `#7c5cbf` | 紫色强调 |
| `--accent-blue` | `#5b8def` | 蓝色强调 |
| `--accent-warm` | `#bfa07c` | 暖色强调（定时器） |
| `--border-subtle` | `rgba(255,255,255,0.06)` | 轻微边框 |
| `--glass-bg` | `rgba(10,15,26,0.75)` | 毛玻璃背景 |

### 新增动画

| 动画名 | 类型 | 用途 |
|--------|------|------|
| `ambientDrift1/2` | CSS @keyframes 20s/25s | 背景环境光漂移 |
| `breathe` | CSS @keyframes 8s | 3 层 Halo 呼吸环（错相 2s/4s） |
| `fadeInUp` | CSS @keyframes 0.8s | 页面元素入场 |
| `slideUp` | CSS @keyframes 0.4s | 控制栏滑入 |
| `dotPulse` | CSS @keyframes 1.2s | 加载三点闪烁 |
| `overlayPulse` | CSS @keyframes 1.5s | 过渡层光晕脉冲 |
| 粒子系统 | Canvas requestAnimationFrame | 60 粒子漂浮背景 |

### 视觉改动详情

| 改动点 | 原始 | 现态 |
|--------|------|------|
| **背景** | 纯色 `#001524` | 双色环境光渐变 blob + Canvas 粒子漂浮 + 深底色 |
| **首页卡片** | 简单 emoji + 文字，hover 上浮 10px | 卡片内径向渐变光晕 + 紫色辉光阴影 + 图标缩放 + 上浮 6px |
| **列表项** | 灰色背景块 | hover 右滑 4px + 紫色边框高亮 + 当前播放项紫色发光 |
| **Halo** | 1 层环，白色 `0.3→0.7` 透明度 | 3 层同心环，紫色微光，错相呼吸 |
| **控制栏** | `blur(20px)` 毛玻璃 | `blur(24px)` + 半透明背景 + 顶边框 + 入场滑入动画 |
| **加载状态** | 无 | 三点脉动动画，显示在 Halo 中央 |
| **错误状态** | 无 | Toast 底部弹出 + Halo 文字切换 |
| **过渡层** | 白色光晕，硬编码 3.6s | 紫色径向渐变，CSS transition 驱动 1.2s |

### 功能改动

| 改动 | 原因 | 详情 |
|------|------|------|
| 过场动画缩短 | 用户反馈 3.6s 太长 | 400ms fade + 800ms overlay + 500ms fade out = ~1.2s |
| 移除 `location.reload()` | 粗暴刷新体验差 | 改为 `showView()` 视图切换，三视图（home/list/player）无缝切换 |
| 播放模式切换 | 原只有随机，且可能连续重复 | 新增「顺序播放」+「随机播放」；随机模式用 `lastRandomIndex` 防止连续重复 |
| iOS 检测修复 | iPadOS 13+ 伪装 Mac 导致误判 | `maxTouchPoints > 1 && /Macintosh/.test(UA)` + 传统检测 |
| 全屏模式 | 提前实现 Phase 3 内容 | 控制栏按钮 + F 键快捷键 |
| 键盘快捷键 | 提前实现 Phase 3 内容 | Space/F/ESC/←→/↑↓ 全部绑定 |

---

## Phase 3：功能补全

### 改动文件
- `index.html`：1217 → 1578 行（+361 行）

### 新增功能：音频进度条

| 子功能 | 实现方式 | 说明 |
|--------|---------|------|
| **进度显示** | `timeupdate` 事件 → 更新 CSS `width%` | 紫色到蓝色渐变填充，0.1s 线性过渡 |
| **缓冲进度** | `player.buffered` API | 灰色半透明覆盖层，显示已缓冲范围 |
| **Seek 拖拽** | `mousedown`/`touchstart` 全局监听 → 计算百分比 → 设 `currentTime` | 支持点击 + 拖拽，全局监听 mouseup/touchend 防漏 |
| **悬停预览** | `mousemove` 计算 → 显示 `formatTime` | 黑色气泡显示对应时间点 |
| **时间标签** | `formatTime()` 工具函数 | 左下角 `00:00 / 00:00`，等宽数字字体 |

### 新增功能：睡眠定时器

| 子功能 | 实现方式 | 说明 |
|--------|---------|------|
| **定时选择** | Popover 弹出菜单 | 4 档：15/30/45/60 分钟，暖色 `--accent-warm` 高亮 |
| **倒计时显示** | `setInterval` 每秒更新 | 按钮上显示 `⏳ 14:32` 格式剩余时间 |
| **自动淡出** | 最后 30 秒线性降低 `player.volume` | 从当前音量线性降至 0，30 步每步 1s |
| **完成提示** | 暂停播放 + 弹出全屏卡片 | 「时间到了，晚安」+ 点击关闭 |
| **音量恢复** | `timerComplete()` 中恢复原始音量 | 避免下次使用时音量为 0 |
| **取消/重置** | 选「关闭定时」或重新选时间 | 清除 interval，重置按钮状态 |

### HTML 新增元素

```html
<!-- 进度条容器 (mousedown/touchstart/mousemove/touchmove/touchend) -->
<div class="progress-container">
  <div class="progress-buffered">  <!-- 缓冲进度 -->
  <div class="progress-fill">      <!-- 播放进度 -->
  <div class="progress-hover-time"> <!-- 悬停时间预览 -->

<!-- 时间显示 -->
<span id="time-current">00:00</span> / <span id="time-duration">00:00</span>

<!-- 定时器按钮 + Popover -->
<button class="timer-btn" id="timer-btn">
<div class="timer-popover">
  <button class="timer-option" data-min="15/30/45/60/0">

<!-- 定时完成卡片 -->
<div class="timer-done-overlay">
  <div class="timer-done-icon">🌙
  <div class="timer-done-text">
```

---

## Phase 4：技术优化

### 改动文件
- `index.html`：1578 → 1694 行（+116 行）
- `.gitignore`：新增

### localStorage 持久化

| Key | 默认值 | 写入时机 | 读取时机 |
|-----|--------|---------|---------|
| `volume` | `0.5` | `setVolume()` 每次拖动 | `init()` 恢复音量滑块和 `player.volume` |
| `lang` | `zh` | `toggleLang()` 切换时 | `init()` 恢复语言 UI |
| `playMode` | `sequential` | `setPlayMode()` 切换时 | `init()` 恢复按钮高亮 |
| `loop` | `false` | `toggleLoop()` 切换时 | `init()` 恢复循环按钮状态 |
| `lastTrack` | — | `onPlaySuccess()` 播放成功时 | 供后续「继续播放」功能使用 |
| `type` | — | `onPlaySuccess()` + `enter()` | 恢复曲目类型 |

存储方式：所有偏好合并为一个 JSON 对象，key 为 `melatonin_prefs`，通过 `store` 模块统一读写。`try/catch` 包裹防止隐私模式/Safari 配额异常。

### 网络错误处理

| 场景 | 处理方式 |
|------|---------|
| **断网** | `window.addEventListener('offline')` → Toast 显示「网络已断开」 |
| **恢复** | `window.addEventListener('online')` → 自动关闭 Toast |
| **音频加载失败** | `player.addEventListener('error')` → Toast + Halo 错误文字 + 暂停状态 |
| **播放被拦截** | `startTrack()` try/catch → `onPlayError()` → 静默处理 iOS 拦截 |
| **localStorage 异常** | try/catch 包裹所有读写 → 降级为内存模式 |

### 响应式完善

| 新增断点 | 尺寸 | 适配内容 |
|----------|------|---------|
| 平板 | 641–1024px | 列表 2–3 列自动填充，Halo 240px |
| 横屏手机 | height ≤500px | 压缩标题/Halo/卡片/控制栏，避免溢出 |
| 手机竖屏（优化） | ≤640px | 控制栏支持换行 + 隐藏 `track-meta` |
| 超小屏（优化） | ≤380px | 音量滑块 40px，按钮间距缩小 |

**共计 5 个 CSS 断点**，覆盖所有主流设备。

### 代码质量

| 改进 | 说明 |
|------|------|
| IIFE 模块化 | `const App = (() => {...})()` 封装全部状态，仅暴露公开 API |
| 公开 API | 15 个方法通过 `return {}` 导出，HTML onclick 绑定 |
| `store` 抽象层 | `.load()` `.save()` `.get()` `.set()` 统一 localStorage 操作 |
| `formatTime()` | 秒数格式化复用函数 |
| `t()` 快捷函数 | 双语文本查找，避免重复 `ui[curLang][key]` |
| `trackName()` | 曲目名称获取统一入口 |
| 注释分区 | `---- 功能名 ----` 分隔 JS 模块 |

---

## Phase 5：部署与文档

### 新增文件

| 文件 | 内容 |
|------|------|
| `.gitignore` | `.DS_Store` / `Thumbs.db` / `.vscode/` / `node_modules/` 等 |
| `README.md` | 155 行，含：简介、功能表、技术栈、运行步骤、项目结构树、快捷键表、设计理念、License |
| `screenshots/.gitkeep` | 截图目录占位，README 中有 5 张截图的文字描述 |

### Git 仓库

| 项目 | 详情 |
|------|------|
| 分支 | `master` (2 commits) |
| 文件数 | 32 files |
| 仓库大小 | ~181MB（主要为 MP3 音频） |

---

## 视觉变化对照表

| 页面 | 原始状态 | 最终状态 |
|------|---------|---------|
| **首页** | 居中标题 + emoji 卡片，纯黑背景 | 环境光渐变 blob 漂移 + Canvas 粒子漂浮 + 暗色主题 + 卡片径向光晕 + hover 辉光阴影 |
| **列表页** | 灰色方块列表，无模式切换 | 曲目列表 + 紫色 hover 滑入 + 当前播放紫色辉光 + 顺序/随机模式切换 |
| **播放页** | 1 层白色 Halo，小字显示曲名 | 3 层紫色同心 Halo 错相呼吸 + 环境光 + 粒子持续运行 |
| **控制栏** | 播放按钮 + 曲名 + 音量 + 循环文本 | 毛玻璃 24px 模糊 + 进度条 + Seek + 时间标签 + 定时器按钮 + 循环/全屏 |
| **加载态** | 无（点击后无反馈） | 三点脉动动画 + "加载中…"文字 |
| **错误态** | 无（静默失败） | Toast 弹窗 + Halo 错误文字 |
| **定时完成** | 无此功能 | 全屏柔光卡片「时间到了，晚安」 |
| **移动端** | 仅 `minmax(280px, 1fr)` 网格 | 5 断点：380/640/1024/1200px + 横屏 500px-height |

---

## 功能增删清单

### 新增功能（15 项）

1. ✅ 3 层呼吸光晕（Halo）动画
2. ✅ Canvas 粒子背景（60 粒子，页面不可见时暂停）
3. ✅ 双色环境光渐变背景
4. ✅ 音频进度条 + Seek 拖拽
5. ✅ 缓冲进度显示
6. ✅ 悬停时间预览
7. ✅ 当前时间 / 总时长显示
8. ✅ 睡眠定时器（15/30/45/60 分钟）
9. ✅ 定时结束自动淡出（最后 30 秒）
10. ✅ 定时完成全屏提示卡片
11. ✅ 全屏沉浸模式
12. ✅ 键盘快捷键（7 个按键）
13. ✅ 顺序播放 / 随机播放模式切换
14. ✅ localStorage 偏好持久化（5 项）
15. ✅ 网络状态监听 + Toast 提示

### 保留并增强的功能（6 项）

1. 🔄 暗色基调 → 扩展为完整暗色主题变量系统
2. 🔄 1 层 Halo → 3 层错相 Halo
3. 🔄 毛玻璃控制栏 → 增强模糊 + 入场动画
4. 🔄 双语数据结构 → 完整保留 `db` + `ui`，增加 `t()` 快捷函数
5. 🔄 过场动画 → 从 3.6s 缩短至 1.2s，CSS transition 驱动
6. 🔄 播放/暂停/音量/循环 → 保留并增加持久化

### 修复的 Bug（4 项）

1. 🐛 iOS iPadOS 13+ 检测失效 → 改用 `maxTouchPoints` + UA 双重检测
2. 🐛 返回按钮 `location.reload()` → 改为视图切换 `showView()`
3. 🐛 随机播放可能连续重复 → `lastRandomIndex` 排除
4. 🐛 无加载反馈 → 三点脉动 + 文字提示

---

## 技术指标

| 指标 | 原始 | 最终 |
|------|:--:|:--:|
| 总行数 | 278 | 1694 |
| CSS 自定义属性 | 2 | 22 |
| CSS 动画关键帧 | 2 | 7 |
| Canvas 系统 | 无 | 60 粒子实时渲染 |
| 响应式断点 | 1 (间接) | 5 (显式) |
| DOM 元素 | 18 | 38 |
| JS 公开 API | 8 | 15 |
| localStorage Key | 0 | 6 |
| 外部依赖 | 1 (Google Fonts) | 1 (Google Fonts) |
| Git 文件数 | 0 | 32 |
| 文档 | 无 | README.md + CHANGELOG.md |
