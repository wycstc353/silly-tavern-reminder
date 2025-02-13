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
        return false;
    }
    
    try {
        const permission = await Notification.requestPermission();
        return permission === "granted";
    } catch (error) {
        console.error("请求通知权限时出错:", error);
        return false;
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

// 添加窗口焦点变化监听
window.addEventListener('focus', () => {
    if (isFlashing) {
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
  $("#title_reminder_setting").prop("checked", extension_settings[extensionName].enableReminder).trigger("input");
  $("#notification_setting").prop("checked", extension_settings[extensionName].enableNotification).trigger("input");
}

// 当扩展设置在 UI 中更改时调用此函数
function onReminderToggle(event) {
  const value = Boolean($(event.target).prop("checked"));
  extension_settings[extensionName].enableReminder = value;
  saveSettingsDebounced();
}

// 添加通知设置切换函数
async function onNotificationToggle(event) {
    const value = Boolean($(event.target).prop("checked"));
    
    if (value && Notification.permission === "denied") {
        toastr.error('通知权限已被拒绝，请在浏览器设置中手动开启');
        $(event.target).prop("checked", false);
        return;
    }

    if (value && Notification.permission !== "granted") {
        const granted = await requestNotificationPermission();
        if (!granted) {
            $(event.target).prop("checked", false);
            return;
        }
    }

    extension_settings[extensionName].enableNotification = value;
    saveSettingsDebounced();
}

// 添加权限申请按钮处理函数
async function onRequestPermissionClick() {
    if (!("Notification" in window)) {
        toastr.error('此浏览器不支持通知功能');
        return;
    }
    
    if (Notification.permission === "denied") {
        toastr.error('通知权限已被拒绝，请在浏览器设置中手动开启');
        return;
    }

    const granted = await requestNotificationPermission();
    if (granted) {
        toastr.success('已获得通知权限');
        // 测试通知
        new Notification("通知权限测试", {
            body: "如果您看到这条通知，说明权限已经设置成功",
            icon: "/favicon.ico"
        });
    } else {
        toastr.warning('未获得通知权限，系统通知功能将无法使用');
    }
}

//监听消息生成完毕事件
eventSource.on(event_types.MESSAGE_RECEIVED, handleIncomingMessage);

// 添加新的判断函数
function shouldSendReminder() {
    // 如果标签页隐藏，肯定需要提醒
    if (document.hidden) {
        return true;
    }
    // 如果标签页可见但窗口失去焦点，也需要提醒
    if (!document.hidden && !document.hasFocus()) {
        return true;
    }
    return false;
}

function handleIncomingMessage(data) {
    const needReminder = shouldSendReminder();
    
    // 标题闪烁提醒
    if (needReminder && extension_settings[extensionName].enableReminder) {
        startTitleFlash();
    }
    // 系统通知提醒
    if (needReminder) {
        sendNotification();
    }
}

// 当扩展加载时调用此函数
jQuery(async () => {
    const settingsHtml = await $.get(`${extensionFolderPath}/reminder.html`);
    $("#extensions_settings2").append(settingsHtml);

    // 加载CSS文件
    const styleSheet = document.createElement('link');
    styleSheet.rel = 'stylesheet';
    styleSheet.href = `/scripts/extensions/third-party/${extensionName}/style.css`;
    document.head.appendChild(styleSheet);

    // 只保留复选框事件监听
    $("#title_reminder_setting").on("input", onReminderToggle);
    $("#notification_setting").on("input", onNotificationToggle);
    $("#request_notification_permission").on("click", onRequestPermissionClick);

    loadSettings();
    
    // 初始化时不自动请求权限，等待用户交互
    if (Notification.permission === "granted") {
        console.log("已具有通知权限");
    }
});