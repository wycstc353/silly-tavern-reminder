# SillyTavern 消息提醒扩展 | SillyTavern Message Reminder Extension

修改自(https://github.com/Mooooooon/silly-tavern-reminder)，由 AI (哈吉米/Claude) 协助修改，添加了自定义音效、平台感知和移动端优化等功能。
Modified from (https://github.com/Mooooooon/silly-tavern-reminder), modified with AI assistance (Hajimi/Claude), adding features like custom sounds, platform awareness, and mobile optimization.

一个为 SillyTavern 提供可配置的消息提醒功能的扩展。
A SillyTavern extension that provides configurable message reminder functionality.

## 功能特点 | Features

- 💻 **标题栏闪烁提醒 (PC) | Title bar flashing reminder (PC)**
  - 仅在电脑浏览器上生效。当切换到其他标签页时，收到新消息会通过闪烁标题提醒。
  - Only effective on desktop browsers. When switched to other tabs, new messages will be reminded by flashing title.

- 🔔 **系统通知提醒 | System notification**
  - 当切换到其他标签页时，收到新消息会通过系统通知提醒（可在所有平台使用，但移动端可靠性可能受限）。
  - When switched to other tabs, new messages will be reminded by system notification (available on all platforms, but reliability may be limited on mobile).

- 🔊 **自定义提示音 | Customizable Sounds**
  - 支持使用本地音频文件替换默认的新消息提醒音和错误提示音。
  - Supports replacing the default new message notification sound and error sound with local audio files.

- ⚠️ **错误提示音 | Error Sound Alert**
  - 当系统发生错误时，会通过提示音进行提醒。
  - When system errors occur, you will be alerted by a sound.

- 📱 **平台感知与移动端优化 | Platform Aware & Mobile Optimized**
  - 自动检测运行平台 (PC/Android/iOS)，并可手动覆盖。
  - Auto-detects the running platform (PC/Android/iOS) and allows manual override.
  - 为移动端提供专属设置（通知行为、震动开关）。
  - Provides mobile-specific settings (notification behavior, vibration toggle).
  - PC 端会自动隐藏移动端专属选项。
  - Mobile-specific options are automatically hidden on PC.

- ✨ **移动端震动提醒 | Mobile Vibration Reminder**
  - 可选功能，在移动设备上收到新消息时触发震动，作为系统通知的补充。
  - Optional feature to trigger vibration on mobile devices upon receiving new messages, complementing system notifications.

- ⏱️ **通知间隔控制 | Notification Interval Control**
  - 可设置最短通知触发间隔，避免短时间内收到过多通知骚扰。
  - Allows setting a minimum interval between notifications to prevent spam during rapid messages.

## 安装方法 | Installation

1. 打开 SillyTavern 扩展管理页面
   Open SillyTavern Extension Management page
2. 点击"从 URL 安装"
   Click "Install from URL"
3. 输入本扩展的 GitHub 仓库地址 (`https://github.com/wycstc353/silly-tavern-reminder` - **请务必替换为你的实际 GitHub 仓库地址!**)
   Input this extension's GitHub repository URL (`https://github.com/wycstc353/silly-tavern-reminder` - **Please be sure to replace this with YOUR actual GitHub repository URL!**)
4. 点击安装
   Click Install

## 使用方法 | Usage

1.  在 **设置 (Settings) -> 扩展 (Extensions) -> 第三方 (Third Party)** 中找到并展开 **酒馆消息提醒 (平台感知版)** 设置。
    Find and expand the **Tavern Message Reminder (Platform Aware)** settings under **Settings -> Extensions -> Third Party**.

2.  **通用设置 (General Settings):**
    *   **启用新消息标题提醒 (PC):** 勾选后在 PC 端生效，切换标签页后新消息会闪烁标题。移动端此选项会被禁用。
        **Enable new message title reminder (PC):** Effective on PC when checked. New messages will flash the title when the tab is inactive. This option is disabled on mobile.
    *   **强制平台模式:** 默认为 "自动检测"。如果自动检测不准确或你想强制使用特定平台的设置（如下方的移动端设置），可以在此手动选择 PC、Android 或 iOS。
        **Force Platform Mode:** Defaults to "Auto Detect". If auto-detection is inaccurate or you want to force settings for a specific platform (like the mobile settings below), you can manually select PC, Android, or iOS here.

3.  **系统通知 & 声音 (System Notifications & Sound):**
    *   **启用新消息系统提醒:** 总开关，勾选后才启用下方的通知相关功能。
        **Enable new message system reminder:** Master switch for notification-related features below.
    *   **通知间隔(秒):** 设置两次通知之间的最小间隔时间（秒）。设为 0 表示不限制。
        **Notification Interval (sec):** Set the minimum time interval (in seconds) between two notifications. Set to 0 for no limit.
    *   **申请通知权限:** 如果系统通知不工作，点击此按钮向浏览器请求权限。
        **Request Notification Permission:** If system notifications aren't working, click this button to request permission from the browser.
    *   **选择提醒声音:** 点击 "选择文件" 上传自定义的新消息提示音，点击 "默认" 恢复自带声音。
        **Choose reminder sound:** Click "Choose File" to upload a custom sound for new messages. Click "Default" to restore the built-in sound.

4.  **错误提示 (Error Handling):**
    *   **启用错误提示音:** 勾选后，程序出错时会播放声音。
        **Enable error sound:** When checked, a sound will play upon program errors.
    *   **选择错误提示音:** 点击 "选择文件" 上传自定义的错误提示音，点击 "默认" 恢复自带声音。
        **Choose error sound:** Click "Choose File" to upload a custom error sound. Click "Default" to restore the built-in sound.

5.  **移动端专属设置 (Mobile Specific Settings):**
    *   *此区域仅在平台被检测为移动端（Android/iOS）或被手动强制为移动端时才会显示。*
        *This section is only visible when the platform is detected as mobile (Android/iOS) or manually forced to a mobile platform.*
    *   **移动端通知方式:** 选择新通知是 "替换旧通知" (推荐，避免列表过长)还是 "允许通知堆叠" (可能产生很多通知条目)。
        **Mobile Notification Behavior:** Choose whether new notifications should "Replace old notification" (recommended, avoids long lists) or "Allow notification stacking" (may create many notification entries).
    *   **启用新消息震动:** 勾选后，在移动端收到新消息时会触发设备震动（需要浏览器支持）。
        **Enable new message vibration:** When checked, receiving a new message on mobile will trigger device vibration (requires browser support).

6.  **提示音文件建议 (Sound File Notes):**
    *   支持常见的音频格式（如 `.mp3`, `.wav`, `.ogg`）。
        Common audio formats (e.g., `.mp3`, `.wav`, `.ogg`) are supported.
    *   建议文件大小不要超过 5MB，以免影响设置保存和加载速度。
        It's recommended to keep file sizes below 5MB to avoid impacting settings saving and loading speed.

## 更新日志 | Update Log

**v1.3 (2025-04-07)**

-   新增：平台自动检测（PC/安卓/iOS）与手动覆盖功能 | Added: Platform auto-detection (PC/Android/iOS) and manual override.
-   新增：移动端专属设置区域，仅在移动平台或强制模式下显示 | Added: Mobile-specific settings section, only visible on mobile platforms or when forced.
-   新增：移动端通知行为选项（替换旧通知/允许通知堆叠）| Added: Mobile notification behavior option (replace/stack).
-   新增：移动端震动提醒选项 | Added: Mobile vibration reminder option.
-   新增：通知发送间隔设置（去重功能）| Added: Notification interval setting (debounce feature).
-   优化：PC 端用户界面隐藏移动端专属设置 | Optimized: Mobile-specific settings are hidden in the UI for PC users.
-   优化：标题闪烁功能仅在 PC 端逻辑中激活 | Optimized: Title flashing logic is now only active on PC platforms.
-   改进：后台 JavaScript 代码进行模块化重构，提高可维护性 | Improved: Background JavaScript code refactored into modules for better maintainability.

*(之前的版本基于 Mooooooon/silly-tavern-reminder 的原始功能)*
*(Previous versions based on the original features of Mooooooon/silly-tavern-reminder)*

## 系统要求 | Prerequisites

-   SillyTavern 1.9.0 或更高版本 (推荐最新版 1.11.x+)
    SillyTavern 1.9.0 or higher (Latest version 1.11.x+ recommended)
-   现代浏览器（支持 Notifications API, Audio API, FileReader API, Vibration API [移动端]）
    Modern browser (with Notifications API, Audio API, FileReader API, Vibration API [mobile] support)

## 支持与贡献 | Support & Contribution

如果您遇到问题或有任何建议，欢迎：
If you encounter any issues or have suggestions, feel free to:

-   在 GitHub 上提交 Issue
    Submit an Issue on GitHub
-   提交 Pull Request 来改进代码
    Submit a Pull Request to improve the code

## 许可证 | License

MIT License
