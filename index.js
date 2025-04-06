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

// 通知管理器
const NotificationManager = {
    // 检查通知支持
    checkSupport() {
        if (!("Notification" in window)) {
            console.log("此浏览器不支持通知功能");
            return false;
        }
        return true;
    },

    // 检查通知权限
    checkPermission() {
        return Notification.permission;
    },

    // 请求通知权限
    async requestPermission() {
        if (!this.checkSupport()) return false;
        
        try {
            const permission = await Notification.requestPermission();
            return permission === "granted";
        } catch (error) {
            console.error("请求通知权限时出错:", error);
            return false;
        }
    },

    // 发送通知
    send() {
        if (this.checkPermission() === "granted" && extension_settings[extensionName].enableNotification) {
            new Notification("SillyTavern 新消息", {
                body: "您有新的消息",
                icon: "/favicon.ico"
            });
        }
    }
};

// 标题闪烁管理器
const TitleFlashManager = {
    timer: null,
    originalTitle: "",
    isFlashing: false,
    newMessageTitle: "【收到新消息了】",
    flashInterval: 1000,

    start() {
        if (this.isFlashing) return;
        this.isFlashing = true;
        this.originalTitle = document.title;
        this.timer = setInterval(() => {
            document.title = document.title === this.newMessageTitle ? this.originalTitle : this.newMessageTitle;
        }, this.flashInterval);
    },

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.isFlashing = false;
        document.title = this.originalTitle;
    }
};

// 使用事件委托优化事件监听
const handleVisibilityChange = () => {
    if (!document.hidden && TitleFlashManager.isFlashing) {
        TitleFlashManager.stop();
    }
};

const handleWindowFocus = () => {
    if (TitleFlashManager.isFlashing) {
        TitleFlashManager.stop();
    }
};

// 添加事件监听
document.addEventListener('visibilitychange', handleVisibilityChange);
window.addEventListener('focus', handleWindowFocus);

// 设置管理器
const SettingsManager = {
    // 加载设置
    async load() {
        extension_settings[extensionName] = extension_settings[extensionName] || {};
        if (Object.keys(extension_settings[extensionName]).length === 0) {
            Object.assign(extension_settings[extensionName], defaultSettings);
        }
        this.updateUI();
    },

    // 更新UI
    updateUI() {
        $("#title_reminder_setting").prop("checked", extension_settings[extensionName].enableReminder);
        $("#notification_setting").prop("checked", extension_settings[extensionName].enableNotification);
    },

    // 保存设置
    save(key, value) {
        extension_settings[extensionName][key] = value;
        saveSettingsDebounced();
    }
};

// 事件处理器
const EventHandler = {
    // 处理提醒开关
    async onReminderToggle(event) {
        const value = Boolean($(event.target).prop("checked"));
        SettingsManager.save('enableReminder', value);
    },

    // 处理通知开关
    async onNotificationToggle(event) {
        const value = Boolean($(event.target).prop("checked"));
        const permission = NotificationManager.checkPermission();

        if (value && permission === "denied") {
            toastr.error('通知权限已被拒绝，请在浏览器设置中手动开启');
            $(event.target).prop("checked", false);
            return;
        }

        if (value && permission !== "granted" && event.isTrigger === undefined) {
            const granted = await NotificationManager.requestPermission();
            if (!granted) {
                $(event.target).prop("checked", false);
                return;
            }
        }

        SettingsManager.save('enableNotification', value);
    },

    // 处理权限申请
    async onRequestPermissionClick() {
        if (!NotificationManager.checkSupport()) {
            toastr.error('此浏览器不支持通知功能');
            return;
        }

        const permission = NotificationManager.checkPermission();
        if (permission === "denied") {
            toastr.error('通知权限已被拒绝，请在浏览器设置中手动开启');
            return;
        }

        const granted = await NotificationManager.requestPermission();
        if (granted) {
            toastr.success('已获得通知权限');
            new Notification("通知权限测试", {
                body: "如果您看到这条通知，说明权限已经设置成功",
                icon: "/favicon.ico"
            });
        } else {
            toastr.warning('未获得通知权限，系统通知功能将无法使用');
        }
    }
};

// 消息处理器
const MessageHandler = {
    shouldSendReminder() {
        return document.hidden || (!document.hidden && !document.hasFocus());
    },

    handleIncomingMessage(data) {
        const needReminder = this.shouldSendReminder();
        
        if (needReminder) {
            if (extension_settings[extensionName].enableReminder) {
                TitleFlashManager.start();
            }
            NotificationManager.send();
        }
    }
};

// 监听消息生成完毕事件
eventSource.on(event_types.MESSAGE_RECEIVED, MessageHandler.handleIncomingMessage.bind(MessageHandler));

// 初始化管理器
const InitManager = {
    async init() {
        try {
            // 加载HTML和CSS
            const settingsHtml = await $.get(`${extensionFolderPath}/reminder.html`);
            $("#extensions_settings2").append(settingsHtml);

            const styleSheet = document.createElement('link');
            styleSheet.rel = 'stylesheet';
            styleSheet.href = `/scripts/extensions/third-party/${extensionName}/style.css`;
            document.head.appendChild(styleSheet);

            // 绑定事件监听
            $("#title_reminder_setting").on("input", EventHandler.onReminderToggle);
            $("#notification_setting").on("input", EventHandler.onNotificationToggle);
            $("#request_notification_permission").on("click", EventHandler.onRequestPermissionClick);

            // 加载设置
            await SettingsManager.load();

            // 检查通知权限
            if (NotificationManager.checkPermission() === "granted") {
                console.log("已具有通知权限");
            }
        } catch (error) {
            console.error("初始化扩展时出错:", error);
        }
    }
};

// 当扩展加载时调用此函数
jQuery(() => InitManager.init());