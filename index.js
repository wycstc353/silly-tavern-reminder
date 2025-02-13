// 扩展的主脚本
// 以下是一些基本扩展功能的示例

// 你可能需要从 extensions.js 导入 extension_settings, getContext 和 loadExtensionSettings
import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";

// 你可能需要从主脚本导入一些其他函数
import { saveSettingsDebounced, eventSource, event_types } from "../../../../script.js";

// 跟踪扩展的位置，名称应与仓库名称匹配
const extensionName = "silly-tavern-reminder";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;
const extensionSettings = extension_settings[extensionName];
const defaultSettings = {
    enableReminder: true, // 添加提醒功能的默认值
    enableNotification: true, // 添加通知功能的默认值
};

// 添加闪烁相关变量
let titleFlashTimer = null;
let originalTitle = document.title;
let isFlashing = false;

// 请求通知权限
async function requestNotificationPermission() {
    if (!("Notification" in window)) {
        console.log("此浏览器不支持通知功能");
        return;
    }
    
    if (Notification.permission !== "granted") {
        await Notification.requestPermission();
    }
}

// 发送通知
function sendNotification() {
    if (Notification.permission === "granted" && extension_settings[extensionName].enableNotification) {
        new Notification("SillyTavern 新消息", {
            body: "您有新的消息",
            icon: "/favicon.ico"
        });
    }
}

// 开始闪烁标题
function startTitleFlash() {
    if (isFlashing) return;
    isFlashing = true;
    originalTitle = document.title;
    titleFlashTimer = setInterval(() => {
        document.title = document.title === "【收到新消息了】" ? originalTitle : "【收到新消息了】";
    }, 1000);
}

// 停止闪烁标题
function stopTitleFlash() {
    if (titleFlashTimer) {
        clearInterval(titleFlashTimer);
        titleFlashTimer = null;
    }
    isFlashing = false;
    document.title = originalTitle;
}

// 监听页面可见性变化
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && isFlashing) {
        stopTitleFlash();
    }
});

// 如果存在扩展设置，则加载它们，否则将其初始化为默认值
async function loadSettings() {
  // 如果设置不存在则创建它们
  extension_settings[extensionName] = extension_settings[extensionName] || {};
  if (Object.keys(extension_settings[extensionName]).length === 0) {
    Object.assign(extension_settings[extensionName], defaultSettings);
  }

  // 在 UI 中更新设置
  $("#example_setting").prop("checked", extension_settings[extensionName].enableReminder).trigger("input");
  $("#notification_setting").prop("checked", extension_settings[extensionName].enableNotification).trigger("input");
}

// 当扩展设置在 UI 中更改时调用此函数
function onReminderToggle(event) {
  const value = Boolean($(event.target).prop("checked"));
  extension_settings[extensionName].enableReminder = value;
  saveSettingsDebounced();
}

// 添加通知设置切换函数
function onNotificationToggle(event) {
    const value = Boolean($(event.target).prop("checked"));
    extension_settings[extensionName].enableNotification = value;
    if (value) {
        requestNotificationPermission();
    }
    saveSettingsDebounced();
}

// 添加权限申请按钮处理函数
async function onRequestPermissionClick() {
    if (!("Notification" in window)) {
        toastr.error('此浏览器不支持通知功能');
        return;
    }
    
    try {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            toastr.success('已获得通知权限');
            // 测试通知
            new Notification("通知权限测试", {
                body: "如果您看到这条通知，说明权限已经设置成功",
                icon: "/favicon.ico"
            });
        } else {
            toastr.warning('未获得通知权限，系统通知功能将无法使用');
        }
    } catch (error) {
        console.error(error);
        toastr.error('申请权限时出现错误');
    }
}

//监听消息生成完毕事件
eventSource.on(event_types.MESSAGE_RECEIVED, handleIncomingMessage);

function handleIncomingMessage(data) {
    // 只在提醒功能开启且页面隐藏时才修改标题和开始闪烁
    if (document.hidden && extension_settings[extensionName].enableReminder) {
        startTitleFlash();
    }
    // 发送通知
    if (document.hidden) {
        sendNotification();
    }
    // 如果页面可见，不做任何处理
}

// 当扩展加载时调用此函数
jQuery(async () => {
    const settingsHtml = await $.get(`${extensionFolderPath}/example.html`);
    $("#extensions_settings2").append(settingsHtml);

    // 只保留复选框事件监听
    $("#example_setting").on("input", onReminderToggle);
    $("#notification_setting").on("input", onNotificationToggle);
    $("#request_notification_permission").on("click", onRequestPermissionClick);

    loadSettings();
    await requestNotificationPermission();
});