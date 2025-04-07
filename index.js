// 文件名: index.js
// 职责: 扩展主入口，加载所有模块，执行初始化流程，绑定 UI 事件和核心事件，协调各模块功能

// --- 核心依赖导入 ---
import { extension_settings } from "../../../extensions.js";
import { saveSettingsDebounced, eventSource, event_types } from "../../../../script.js";
// declare var toastr: any;

// --- 自定义模块导入 ---
import * as Settings from './settings.js';
import * as Audio from './audio.js';
import * as Notifications from './notifications.js';
import * as TitleFlash from './title_flash.js';
import * as Platform from './platform.js';
import * as MobileFeatures from './mobile_features.js';
import * as ErrorHandler from './error_handler.js';

// --- 常量定义 ---
const extensionName = "silly-tavern-reminder";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

// --- 状态变量 ---
let lastNotificationTimestamp = 0; // 用于通知/声音/震动的去重时间戳

// --- 初始化管理器对象 ---
const InitManager = {
    async init() {
        console.log(`%c[${extensionName}] 开始初始化...`, "color: blue; font-weight: bold;");
        try {
            Platform.initPlatform();
            Settings.loadSettings(extensionName);
            Audio.initAudio();
            TitleFlash.initTitleFlash();
            ErrorHandler.initErrorHandler({ playError: Audio.playError });
            await this.loadInterface();
            this.bindUIEvents();
            Settings.updateUISettings(); // 确保在绑定事件后更新UI初始状态
            this.bindCoreEvents();

            console.log(`%c[${extensionName}] 初始化成功完成！`, "color: lightgreen; font-weight: bold;");
            console.log(`[${extensionName}] 自动检测平台: ${Platform.detectedPlatform}, 当前生效平台: ${Platform.getEffectivePlatform()}`);
            console.log(`[${extensionName}] 通知权限初始状态: ${Notifications.checkPermission()}`);

        } catch (error) {
             console.error(`%c[${extensionName}] 初始化过程中发生严重错误:`, "color: red; font-weight: bold;", error);
             this.showErrorToast(`扩展 ${extensionName} 初始化失败，请检查浏览器控制台日志获取详细信息。`);
        }
    },

    async loadInterface() {
        try {
            console.log(`[${extensionName}] 加载 HTML (${extensionFolderPath}/reminder.html)...`);
            const settingsHtml = await $.get(`${extensionFolderPath}/reminder.html`);
            const targetContainer = $("#extensions_settings2");
            if (!targetContainer.length) {
                 console.warn(`[${extensionName}] 无法找到设置注入点 #extensions_settings2，HTML 未加载。`);
                 return;
            }
            targetContainer.append(settingsHtml);
            console.log(`[${extensionName}] HTML 注入完成`);

            const cssPath = `${extensionFolderPath}/style.css`;
            if (!$(`link[href="${cssPath}"]`).length) {
                 fetch(cssPath)
                     .then(response => {
                         if(response.ok) {
                             console.log(`[${extensionName}] 加载 CSS (${cssPath})...`);
                             const link = document.createElement('link');
                             link.rel = 'stylesheet'; link.type = 'text/css'; link.href = cssPath;
                             document.head.appendChild(link);
                             console.log(`[${extensionName}] CSS 注入完成`);
                         }
                     })
                     .catch(()=>{ /* 静默 */ });
            }
        } catch (error) {
             console.error(`[${extensionName}] 加载界面 (HTML/CSS) 时出错:`, error);
             this.showErrorToast(`加载 ${extensionName} 扩展界面失败。`);
        }
    },

    bindUIEvents() {
         console.log(`[${extensionName}] 绑定 UI 事件监听器...`);
        const settingsContainer = $(".reminder-extension-settings");
        if (!settingsContainer.length) {
            console.error(`[${extensionName}] 无法找到设置容器 .reminder-extension-settings，UI 事件未绑定！`);
            return;
        }
        // 使用事件委托绑定所有事件
        settingsContainer.on("change", "#enableReminder", (event) => Settings.saveSetting('enableReminder', $(event.target).prop("checked")));
        settingsContainer.on("change", "#platformOverride", (event) => { Settings.saveSetting('platformOverride', $(event.target).val()); Settings.updateUISettings(); console.log(`[${extensionName}] 用户更改平台模式, 当前生效: ${Platform.getEffectivePlatform()}`); });
        settingsContainer.on("click", "#request_notification_permission", EventHandler.onRequestPermissionClick);
        settingsContainer.on("change", "#enableNotification", EventHandler.onNotificationToggle);
        settingsContainer.on("change", "#notificationDebounceSeconds", (event) => Settings.saveSetting('notificationDebounceSeconds', parseInt($(event.target).val(), 10) || 0)); // 确保是数字
        settingsContainer.on("change", "#notification_sound_file", (event) => EventHandler.onFileSelected(event, 'notification'));
        settingsContainer.on("click", "#clear_notification_sound", () => EventHandler.clearSoundFile('notification'));
        settingsContainer.on("change", "#enableErrorSound", (event) => Settings.saveSetting('enableErrorSound', $(event.target).prop("checked")));
        settingsContainer.on("change", "#error_sound_file", (event) => EventHandler.onFileSelected(event, 'error'));
        settingsContainer.on("click", "#clear_error_sound", () => EventHandler.clearSoundFile('error'));
        settingsContainer.on("change", "#mobileNotificationBehavior", (event) => Settings.saveSetting('mobileNotificationBehavior', $(event.target).val()));
        settingsContainer.on("change", "#enableVibration", (event) => Settings.saveSetting('enableVibration', $(event.target).prop("checked")));
        console.log(`[${extensionName}] UI 事件监听器绑定完成`);
    },

    bindCoreEvents() {
        console.log(`[${extensionName}] 绑定核心事件 (MESSAGE_RECEIVED)...`);
        eventSource.on(event_types.MESSAGE_RECEIVED, MessageHandler.handleIncomingMessage.bind(MessageHandler));
        console.log(`[${extensionName}] 核心事件绑定完成`);
    },

    showErrorToast(message, title = "扩展错误") {
         try {
            if (typeof toastr !== 'undefined' && toastr.error) {
                toastr.error(message, title, { timeOut: 10000 });
            } else {
                 console.error(`[${extensionName}] Toastr 不可用，无法显示错误: ${message}`);
            }
        } catch (e) {
            console.error(`[${extensionName}] 显示 Toastr 错误时失败:`, e);
        }
    }
};

// --- UI 事件处理器对象 ---
const EventHandler = {
    async onNotificationToggle(event) {
        const isChecked = $(event.target).prop("checked");
        const currentPermission = Notifications.checkPermission();

        if (isChecked && currentPermission === "denied") {
            toastr.error('通知权限已被浏览器拒绝。请在浏览器设置中手动开启。');
            $(event.target).prop("checked", false);
            // 不需要手动调用 updateUISettings，saveSetting 会调用
            return;
        }

        if (isChecked && currentPermission === "default" && event.isTrigger === undefined) {
            toastr.info('请求浏览器通知授权...');
            const granted = await Notifications.requestPermission();
            if (!granted) {
                toastr.warning('未获得通知权限。');
                $(event.target).prop("checked", false);
                Settings.saveSetting('enableNotification', false); // 保存未勾选状态
                return;
            } else {
                toastr.success('已获得通知权限！');
            }
        }
        Settings.saveSetting('enableNotification', isChecked);
    },

    onFileSelected(event, type) {
        const file = event.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('audio/')) { toastr.error('请选择有效的音频文件。'); $(event.target).val(''); return; }
        const maxSizeMB = 5; if (file.size > maxSizeMB * 1024 * 1024) { toastr.error(`文件需小于 ${maxSizeMB}MB。`); $(event.target).val(''); return; }
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result; const filename = file.name;
            Settings.saveSetting(`${type}SoundDataUrl`, dataUrl); Settings.saveSetting(`${type}SoundFilename`, filename);
            if (type === 'notification') Audio.updateNotificationSound(dataUrl); else Audio.updateErrorSound(dataUrl);
            toastr.success(`${type === 'notification' ? '提醒' : '错误'}声音 "${filename}" 已设置`);
        };
        reader.onerror = (e) => { toastr.error(`读取文件 "${file.name}" 出错。`); $(event.target).val(''); };
        reader.readAsDataURL(file);
    },

    clearSoundFile(type) {
        Settings.saveSetting(`${type}SoundDataUrl`, null); Settings.saveSetting(`${type}SoundFilename`, '');
        const inputSelector = `#${type}_sound_file`;
        if (type === 'notification') { Audio.updateNotificationSound(null); } else { Audio.updateErrorSound(null); }
        $(inputSelector).val(''); // 清空文件选择框
        toastr.info(`${type === 'notification' ? '提醒' : '错误'}声音已恢复默认`);
    },

    async onRequestPermissionClick() {
        if (!Notifications.checkSupport()) { toastr.error('浏览器不支持通知。'); return; }
        const currentPermission = Notifications.checkPermission();
        console.log(`[${extensionName}] onRequestPermissionClick: currentPermission=${currentPermission}`);

        const checkDebounce = () => {
            const debounceSeconds = Settings.getSetting('notificationDebounceSeconds') || 0;
            const now = Date.now(); const timeSinceLast = now - lastNotificationTimestamp;
            console.log(`[${extensionName}] checkDebounce (Test Button): now=${now}, lastTs=${lastNotificationTimestamp}, diff=${timeSinceLast}, debounce=${debounceSeconds * 1000}`);
            if (debounceSeconds > 0 && (timeSinceLast < debounceSeconds * 1000)) {
                console.log(`[${extensionName}] 测试通知/声音已跳过 (通知间隔)`);
                toastr.info(`测试通知已跳过 (在 ${debounceSeconds} 秒的间隔内)`);
                return true; // 需要跳过
            }
            return false; // 可以继续
        };

        const trySendTestNotificationAndSound = async (grantedJustNow = false) => {
            if (!checkDebounce()) {
                lastNotificationTimestamp = Date.now();
                console.log(`[${extensionName}] 更新 lastNotificationTimestamp (测试触发): ${lastNotificationTimestamp}`);
                let notificationSent = false; let soundPlayed = false;
                try {
                    console.log(`[${extensionName}] (Test) 尝试发送测试通知...`);
                    const notification = new Notification("权限测试", { body: "通知权限正常！", icon: "/favicon.ico", silent: true, tag: 'st-perm-test' });
                    console.log(`[${extensionName}] (Test) 测试通知对象已创建:`, notification);
                    notificationSent = true;
                } catch (notificationError) {
                    console.error(`[${extensionName}] (Test) 发送测试通知失败:`, notificationError);
                    toastr.error("发送测试通知失败，请检查控制台。");
                }
                try {
                    console.log(`[${extensionName}] (Test) 尝试播放测试声音...`);
                    await Audio.playNotification();
                    console.log(`[${extensionName}] (Test) 测试声音播放尝试完成`);
                    soundPlayed = true;
                } catch (playError) {
                    console.error(`[${extensionName}] (Test) 测试声音播放失败:`, playError);
                    if (!notificationSent) { toastr.warning("声音播放失败 (可能是浏览器限制)。"); }
                    else { toastr.warning("测试通知已发送，但声音播放失败。"); }
                }
                if (notificationSent && soundPlayed) { toastr.success(grantedJustNow ? "权限已获取，测试通知和声音已触发！" : "测试通知和声音已触发！"); }
            }
             // 确保总开关开启
             if (!Settings.getSetting('enableNotification')) {
                 console.log(`[${extensionName}] (Test) 检测到总开关关闭，自动开启并保存...`);
                 Settings.saveSetting('enableNotification', true);
             }
        };

        if (currentPermission === "denied") {
            toastr.error('权限已被拒绝，请在浏览器设置中修改。');
            if (Settings.getSetting('enableNotification')) { Settings.saveSetting('enableNotification', false); }
            return;
        }
        if (currentPermission === "granted") {
             toastr.info('已获得通知权限。');
             await trySendTestNotificationAndSound(false);
             return;
        }
        // currentPermission === "default"
        toastr.info('请求浏览器通知权限...');
        const granted = await Notifications.requestPermission();
        if (granted) {
            toastr.success('成功获得权限！');
            await trySendTestNotificationAndSound(true);
        } else {
            toastr.warning('未获得权限，通知功能无法使用。');
            Settings.saveSetting('enableNotification', false);
        }
    }
};


// --- 消息处理器对象 ---
const MessageHandler = {
    shouldSendReminder() {
        const should = document.hidden || !document.hasFocus();
        // console.log(`[${extensionName}] [MessageHandler] shouldSendReminder check: hidden=${document.hidden}, hasFocus=${document.hasFocus()}, result=${should}`); // 详细日志
        return should;
     },

    async handleIncomingMessage(data) {
        console.log(`\n--- [${extensionName}] [MessageHandler] handleIncomingMessage ---`); // 开始标记
        const now = Date.now();
        // 1. 检查页面是否需要提醒
        if (!this.shouldSendReminder()) {
            console.log(`[${extensionName}] [MessageHandler] 页面激活，跳过所有提醒。`);
            return;
        }
        console.log(`[${extensionName}] [MessageHandler] 页面非激活，继续处理提醒。`);

        // 1.5 处理标题闪烁 (仅 PC 平台) - 独立于通知间隔
        const effectivePlatform = Platform.getEffectivePlatform();
        const isMobile = Platform.isMobilePlatform(effectivePlatform);
        const reminderEnabled = Settings.getSetting('enableReminder');
        console.log(`[${extensionName}] [MessageHandler] 平台: ${effectivePlatform}, 是否移动端: ${isMobile}, 标题提醒开关: ${reminderEnabled}`);

        if (!isMobile && reminderEnabled) {
            console.log(`[${extensionName}] [MessageHandler] 尝试触发标题闪烁 (PC)...`);
            TitleFlash.startFlashing(); // startFlashing 内部会再次检查状态
        } else {
            console.log(`[${extensionName}] [MessageHandler] 跳过标题闪烁 (原因: 移动端或开关关闭)。`);
        }

        // 2. 检查通知/声音/震动间隔
        const debounceSeconds = Settings.getSetting('notificationDebounceSeconds') || 0;
        console.log(`[${extensionName}] [MessageHandler] 检查间隔: debounceSeconds=${debounceSeconds}, lastTimestamp=${lastNotificationTimestamp}, now=${now}`);
        if (debounceSeconds > 0 && (now - lastNotificationTimestamp < debounceSeconds * 1000)) {
            console.log(`%c[${extensionName}] [MessageHandler] 通知/声音/震动已跳过 (间隔内)。`, 'color: orange;');
            return; // 在间隔内则退出
        }
        console.log(`[${extensionName}] [MessageHandler] 间隔检查通过或禁用。`);

        // 3. 更新全局的上次通知时间戳
        lastNotificationTimestamp = now;
        console.log(`[${extensionName}] [MessageHandler] 更新 lastNotificationTimestamp: ${lastNotificationTimestamp}`);

        // 4. (平台信息已获取)

        // 5. 根据平台和设置触发通知/声音/震动
        const notificationEnabled = Settings.getSetting('enableNotification');
        console.log(`[${extensionName}] [MessageHandler] 系统通知开关: ${notificationEnabled}`);
        if (notificationEnabled) {
            console.log(`%c[${extensionName}] [MessageHandler] 尝试发送系统通知 (并播放声音)...`, 'color: cyan;');
            // !! Notifications.sendNotification 内部会调用 Audio.playNotification !!
            await Notifications.sendNotification();
        } else {
            console.log(`[${extensionName}] [MessageHandler] 跳过系统通知和声音 (原因: 开关关闭)。`);
        }

        const vibrationEnabled = Settings.getSetting('enableVibration');
        console.log(`[${extensionName}] [MessageHandler] 移动端震动开关: ${vibrationEnabled}`);
        if (isMobile && vibrationEnabled) {
            console.log(`[${extensionName}] [MessageHandler] 尝试触发震动 (移动端)...`);
            MobileFeatures.triggerVibration();
        } else {
             console.log(`[${extensionName}] [MessageHandler] 跳过震动 (原因: 非移动端或开关关闭)。`);
        }
        console.log(`--- [${extensionName}] [MessageHandler] handleIncomingMessage END ---`); // 结束标记
    }
};

// --- 启动初始化 ---
jQuery(() => {
    const initDelay = 300;
    console.log(`[${extensionName}] 等待 ${initDelay}ms 后开始初始化...`);
    setTimeout(() => { InitManager.init(); }, initDelay);
});