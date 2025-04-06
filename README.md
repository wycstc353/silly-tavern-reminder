# SillyTavern 消息提醒扩展 | SillyTavern Message Reminder Extension

修改自(https://github.com/Mooooooon/silly-tavern-reminder),用哈吉米改了一下，添加了自定义音效的功能。
一个为 SillyTavern 提供消息提醒功能的扩展。

A SillyTavern extension that provides message reminder functionality.

## 功能特点 | Features

- 📢 **标题栏闪烁提醒 | Title bar flashing reminder**
  - 当切换到其他标签页时，收到新消息会通过闪烁标题提醒
  - When switched to other tabs, new messages will be reminded by flashing title

- 🔔 **系统通知提醒 | System notification**
  - 当切换到其他标签页时，收到新消息会通过系统通知提醒
  - When switched to other tabs, new messages will be reminded by system notification

- 🔊 **自定义提示音 | Customizable Sounds**
  - 支持使用本地音频文件替换默认的新消息提醒音和错误提示音
  - Supports replacing the default new message notification sound and error sound with local audio files

- ⚠️ **错误通知功能 | Error Notification**
  - 当系统发生错误时，会通过系统通知（可选）和提示音进行提醒
  - When system errors occur, you will be notified through system notifications (optional) and sound alerts

## 安装方法 | Installation

1. 打开 SillyTavern 扩展管理页面
   Open SillyTavern Extension Management page
2. 点击"从 URL 安装"
   Click "Install from URL"
3. 输入本扩展的 GitHub 仓库地址 (`https://github.com/wycstc353/silly-tavern-reminder` - **请替换为你的实际仓库地址**)
   Input this extension's GitHub repository URL (`https://github.com/wycstc353/silly-tavern-reminder` - **Please replace with your actual repository URL**)
4. 点击安装
   Click Install

## 使用方法 | Usage

1. 在 **设置 (Settings) -> 扩展 (Extensions) -> 第三方 (Third Party)** 中找到并展开 **酒馆消息提醒 (Tavern Message Reminder)** 设置。
   Find and expand the **Tavern Message Reminder** settings under **Settings -> Extensions -> Third Party**.

2. 根据需要开启或关闭各种提醒方式（标题闪烁、系统提醒、错误提示音）的复选框。
   Enable or disable the checkboxes for different reminder methods (title flashing, system reminder, error sound) as needed.

3. **修改提示音 (Changing Sounds):**
   - 在 "启用新消息系统提醒" 下方，点击 "选择文件" 按钮选择您想用于新消息的本地音频文件。
     Below "Enable new message system reminder", click the "Choose File" button to select a local audio file for new messages.
   - 在 "启用错误提示音" 下方，点击 "选择文件" 按钮选择您想用于错误的本地音频文件。
     Below "Enable error sound", click the "Choose File" button to select a local audio file for errors.
   - 点击旁边的 "默认" 按钮可清除自定义选择，恢复为扩展自带的默认声音。
     Click the adjacent "Default" button to clear your custom selection and revert to the extension's default sound.
   - *提示：支持常见的音频格式（如 .mp3, .wav, .ogg）。建议文件大小不要超过 5MB。*
     *Note: Common audio formats (e.g., .mp3, .wav, .ogg) are supported. It's recommended to keep file sizes below 5MB.*

4. 如需使用 **系统通知**，请确保对应复选框已勾选。如果权限未授予或被拒绝，请点击 **申请通知权限 (Request Notification Permission)** 按钮并按照浏览器提示操作。
   To use **System Notifications**, ensure the corresponding checkbox is checked. If permission is not granted or denied, click the **Request Notification Permission** button and follow the browser prompts.

## 系统要求 | Prerequisites

- SillyTavern 1.9.0 或更高版本 (推荐最新版)
  SillyTavern 1.9.0 or higher (Latest version recommended)
- 现代浏览器（支持 Notifications API, Audio API, FileReader API）
  Modern browser (with Notifications API, Audio API, FileReader API support)

## 支持与贡献 | Support & Contribution

如果您遇到问题或有任何建议，欢迎：
If you encounter any issues or have suggestions, feel free to:

- 在 GitHub 上提交 Issue
  Submit an Issue on GitHub
- 提交 Pull Request 来改进代码
  Submit a Pull Request to improve the code

## 许可证 | License

MIT License
