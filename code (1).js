// 文件名: index.js
// 职责: 扩展主入口，加载所有模块，执行初始化流程，绑定 UI 事件和核心事件，协调各模块功能

// --- 核心依赖导入 ---
import { extension_settings } from "../../../extensions.js";
import { saveSettingsDebounced, eventSource, event_types } from "../../../../script.js";
// 假设 toastr 在全局可用

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
// 用于通知去重的时间戳
let lastNotificationTimestamp = 0;

// --- 初始化管理器对象 ---
const InitManager = {
    /**
     * 异步执行初始化流程
     */
    async init() {
        console.log(`%c[${extensionName}] 开始初始化...`, "color: blue; font-weight: bold;");
        try {
            Platform.initPlatform(); // 1. 检测平台
            Settings.loadSettings(extensionName); // 2. 加载设置
            Audio.initAudio(); // 3. 初始化音频
            TitleFlash.initTitleFlash(); // 4. 初始化标题闪烁
            ErrorHandler.initErrorHandler({ playError: Audio.playError }); // 5. 初始化错误处理
            await this.loadInterface(); // 6. 加载 HTML 界面
            this.bindUIEvents(); // 7. 绑定 UI 事件
            Settings.updateUISettings(); // 8. 更新 UI 初始状态
            this.bindCoreEvents(); // 9. 绑定核心事件

            console.log(`%c[${extensionName}] 初始化成功完成！`, "color: lightgreen; font-weight: bold;");
            console.log(`[${extensionName}] 自动检测平台: ${Platform.detectedPlatform}, 当前生效平台: ${Platform.getEffectivePlatform()}`);
            console.log(`[${extensionName}] 通知权限初始状态: ${Notifications.checkPermission()}`);
        } catch (error) {
             console.error(`%c[${extensionName}] 初始化过程中发生严重错误:`, "color: red; font-weight: bold;", error);
             this.showErrorToast(`扩展 ${extensionName} 初始化失败，请检查浏览器控制台日志获取详细信息。`);
        }
    },
    /**
     * 异步加载 HTML 界面和可选的 CSS 文件
     */
    async loadInterface() {
        try {
            console.log(`[${extensionName}] 加载 HTML (${extensionFolderPath}/reminder.html)...`);
            const settingsHtml = await $.get(`${extensionFolderPath}/reminder.html`);
            const targetContainer = $("#extensions_settings2");
            if (!targetContainer.length) { console.warn(`[${extensionName}] 无法找到 #extensions_settings2，HTML 未加载。`); return; }
            targetContainer.append(settingsHtml);
            console.log(`[${extensionName}] HTML 注入完成`);
            const cssPath = `${extensionFolderPath}/style.css`;
            if (!$(`link[href="${cssPath}"]`).length) {
                 fetch(cssPath).then(response => {
                     if(response.ok) { const link = document.createElement('link'); link.rel = 'stylesheet'; link.type = 'text/css'; link.href = cssPath; document.head.appendChild(link); console.log(`[${extensionName}] CSS 注入完成`); }
                 }).catch(()=>{/* 静默 */});
            }
        } catch (error) {
             console.error(`[${extensionName}] 加载界面 (HTML/CSS) 时出错:`, error);
             this.showErrorToast(`加载 ${extensionName} 扩展界面失败。`);
        }
    },
    /**
     * 绑定设置界面上各 UI 元素的事件监听器 (使用事件委托)
     */
    bindUIEvents() {
         console.log(`[${extensionName}] 绑定 UI 事件监听器...`);
        const settingsContainer = $(".reminder-extension-settings");
        if (!settingsContainer.length) { console.error(`[${extensionName}] 无法找到设置容器，UI 事件未绑定！`); return; }
        // --- 绑定各控件的事件 ---
        settingsContainer.on("change", "#enableReminder", (event) => Settings.saveSetting('enableReminder', $(event.target).prop("checked")));
        settingsContainer.on("change", "#platformOverride", (event) => { Settings.saveSetting('platformOverride', $(event.target).val()); Settings.updateUISettings(); console.log(`[${extensionName}] 用户更改平台模式, 当前生效: ${Platform.getEffectivePlatform()}`); });
        settingsContainer.on("click", "#request_notification_permission", EventHandler.onRequestPermissionClick); // 调用修正后的函数
        settingsContainer.on("change", "#enableNotification", EventHandler.onNotificationToggle);
        settingsContainer.on("change", "#notificationDebounceSeconds", (event) => Settings.saveSetting('notificationDebounceSeconds', $(event.target).val()));
        settingsContainer.on("change", "#notification_sound_file", (event) => EventHandler.onFileSelected(event, 'notification'));
        settingsContainer.on("click", "#clear_notification_sound", () => EventHandler.clearSoundFile('notification'));
        settingsContainer.on("change", "#enableErrorSound", (event) => Settings.saveSetting('enableErrorSound', $(event.target).prop("checked")));
        settingsContainer.on("change", "#error_sound_file", (event) => EventHandler.onFileSelected(event, 'error'));
        settingsContainer.on("click", "#clear_error_sound", () => EventHandler.clearSoundFile('error'));
        settingsContainer.on("change", "#mobileNotificationBehavior", (event) => Settings.saveSetting('mobileNotificationBehavior', $(event.target).val()));
        settingsContainer.on("change", "#enableVibration", (event) => Settings.saveSetting('enableVibration', $(event.target).prop("checked")));
         console.log(`[${extensionName}] UI 事件监听器绑定完成`);
    },
    /**
     * 绑定 SillyTavern 核心事件监听器 (主要是新消息事件)
     */
    bindCoreEvents() {
        console.log(`[${extensionName}] 绑定核心事件 (MESSAGE_RECEIVED)...`);
        eventSource.on(event_types.MESSAGE_RECEIVED, MessageHandler.handleIncomingMessage);
        console.log(`[${extensionName}] 核心事件绑定完成`);
    },
    /**
     * 辅助函数：显示错误提示信息 (使用 toastr 库)
     */
    showErrorToast(message, title = "扩展错误") {
         try { if (typeof toastr !== 'undefined' && toastr.error) { toastr.error(message, title, { timeOut: 10000 }); } else { console.error(`[${extensionName}] Toastr 不可用: ${message}`); } } catch (e) { console.error(`[${extensionName}] 显示 Toastr 错误失败:`, e); }
    }
};

// --- UI 事件处理器对象 ---
const EventHandler = {
    /**
     * 处理 "启用新消息系统提醒" 复选框的 'change' 事件
     */
    async onNotificationToggle(event) {
        const isChecked = $(event.target).prop("checked"); const currentPermission = Notifications.checkPermission();
        if (isChecked && currentPermission === "denied") { toastr.error('通知权限已被浏览器拒绝。请在浏览器设置中手动开启。'); $(event.target).prop("checked", false); Settings.updateUISettings(); return; }
        if (isChecked && currentPermission === "default" && event.isTrigger === undefined) {
            toastr.info('请求浏览器通知授权...');
            const granted = await Notifications.requestPermission();
            if (!granted) { toastr.warning('未获得通知权限。'); $(event.target).prop("checked", false); Settings.updateUISettings(); return; }
            else { toastr.success('已获得通知权限！'); } // 获得权限时给提示
        }
        Settings.saveSetting('enableNotification', isChecked); // 保存开关状态
    },
    /**
     * 处理文件选择输入框的 'change' 事件
     */
    onFileSelected(event, type) {
        const file = event.target.files[0]; if (!file) return;
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
    /**
     * 处理 "默认" 按钮的 'click' 事件，用于清除自定义声音
     */
    clearSoundFile(type) {
        Settings.saveSetting(`${type}SoundDataUrl`, null); Settings.saveSetting(`${type}SoundFilename`, '');
        if (type === 'notification') { Audio.updateNotificationSound(null); $(`#notification_sound_file`).val(''); }
        else { Audio.updateErrorSound(null); $(`#error_sound_file`).val(''); }
        toastr.info(`${type === 'notification' ? '提醒' : '错误'}声音已恢复默认`);
    },

    /**
     * !! 再次修正后的函数：处理 "申请/测试系统通知权限" 按钮的 'click' 事件 !!
     * - 增加明确的成功提示 toastr
     * - 调整时间戳更新和 try...catch 结构
     */
    async onRequestPermissionClick() {
        // 1. 检查浏览器支持
        if (!Notifications.checkSupport()) { toastr.error('浏览器不支持通知。'); return; }
        // 2. 获取当前权限
        const currentPermission = Notifications.checkPermission();
        console.log(`[${extensionName}] onRequestPermissionClick: currentPermission=${currentPermission}`);

        // 3. --- 定义检查通知间隔的辅助函数 ---
        const checkDebounce = () => {
            const debounceSeconds = Settings.getSetting('notificationDebounceSeconds') || 0;
            const now = Date.now();
            const timeSinceLast = now - lastNotificationTimestamp;
            console.log(`[${extensionName}] checkDebounce: now=${now}, lastTs=${lastNotificationTimestamp}, diff=${timeSinceLast}, debounce=${debounceSeconds * 1000}`);
            if (debounceSeconds > 0 && (timeSinceLast < debounceSeconds * 1000)) {
                console.log(`[${extensionName}] 测试通知/声音已跳过 (通知间隔)`);
                toastr.info(`测试通知已跳过 (在 ${debounceSeconds} 秒的间隔内)`);
                return true; // 需要跳过
            }
            return false; // 可以继续
        };
        // ------------------------------------

        // --- 尝试执行测试（如果权限允许） ---
        const trySendTestNotification = async (grantedJustNow = false) => {
            // 检查间隔
            if (!checkDebounce()) {
                // 间隔允许，先更新时间戳
                lastNotificationTimestamp = Date.now();
                console.log(`[${extensionName}] 更新 lastNotificationTimestamp (测试触发): ${lastNotificationTimestamp}`);

                let notificationSent = false;
                let soundPlayed = false;

                // 尝试发送通知
                try {
                    console.log(`[${extensionName}] 尝试发送测试通知...`);
                    const notification = new Notification("权限测试", { body: "通知权限正常！", icon: "/favicon.ico", silent: true, tag: 'st-perm-test' });
                    console.log(`[${extensionName}] 测试通知对象已创建:`, notification);
                    notificationSent = true; // 标记通知发送（尝试）成功
                } catch (notificationError) {
                    console.error(`[${extensionName}] 发送测试通知失败:`, notificationError);
                    toastr.error("发送测试通知失败，请检查控制台。");
                    // 注意：即使失败，时间戳也已被更新
                }

                // 尝试播放声音 (无论通知是否成功，都尝试播放)
                try {
                    console.log(`[${extensionName}] 尝试播放测试声音...`);
                    await Audio.playNotification(); // 等待播放尝试完成
                    console.log(`[${extensionName}] 测试声音播放尝试完成`);
                    soundPlayed = true; // 标记声音播放（尝试）成功
                } catch (playError) {
                    console.error(`[${extensionName}] 测试声音播放失败:`, playError);
                    // 只有在通知也发送失败时才显示这个错误，避免重复提示
                    if (!notificationSent) {
                        toastr.warning("声音播放失败 (可能是浏览器限制)。");
                    } else {
                        // 如果通知发送成功但声音失败
                        toastr.warning("测试通知已发送，但声音播放失败。");
                    }
                }

                // !! 根据尝试结果给出最终提示 !!
                if (notificationSent && soundPlayed) {
                    toastr.success(grantedJustNow ? "权限已获取，测试通知和声音已触发！" : "测试通知和声音已触发！");
                } else if (notificationSent && !soundPlayed) {
                    // toastr.warning 已经在 catch 中处理
                } else if (!notificationSent && soundPlayed) {
                    // 理论上不太可能发生，但以防万一
                    toastr.warning("测试通知发送失败，但声音已播放？");
                } else {
                    // 两者都失败，错误已在各自 catch 中提示
                }
            }
             // 确保通知总开关是开启状态
             if (!$("#enableNotification").prop("checked")) { Settings.saveSetting('enableNotification', true); }
        };
        // ------------------------------------


        // 4. --- 根据当前权限状态执行 ---
        if (currentPermission === "denied") { // 权限已被拒绝
            toastr.error('权限已被拒绝，请在浏览器设置中修改。');
            if ($("#enableNotification").prop("checked")) { Settings.saveSetting('enableNotification', false); } // 确保开关关闭
            return; // 结束
        }

        if (currentPermission === "granted") { // 权限已授予
             toastr.info('已获得通知权限。'); // 先给一个基本信息
             await trySendTestNotification(false); // 尝试发送测试，标记非刚授权
             return; // 结束
        }

        // 如果权限状态是 'default' (需要请求)
        toastr.info('请求浏览器通知权限...');
        const granted = await Notifications.requestPermission(); // 发起权限请求
        if (granted) { // 如果用户同意授权
            // !! 立即显示权限获取成功 !!
            toastr.success('成功获得权限！');
            await trySendTestNotification(true); // 尝试发送测试，标记是刚授权
        } else { // 如果用户拒绝授权
            toastr.warning('未获得权限，通知功能无法使用。');
            Settings.saveSetting('enableNotification', false); // 确保开关关闭
        }
        // UI 更新由 saveSetting -> updateUISettings 处理
    }
};


// --- 消息处理器对象 ---
const MessageHandler = {
    /**
     * 判断当前是否需要发送提醒（页面是否非激活）
     */
    shouldSendReminder() { return document.hidden || !document.hasFocus(); },

    /**
     * 处理 SillyTavern 发出的新消息事件
     */
    async handleIncomingMessage(data) {
        const now = Date.now(); // 获取当前时间戳
        // 1. 检查页面是否需要提醒
        if (!this.shouldSendReminder()) return; // 页面活动则退出

        // 2. 检查通知间隔
        const debounceSeconds = Settings.getSetting('notificationDebounceSeconds') || 0;
        if (debounceSeconds > 0 && (now - lastNotificationTimestamp < debounceSeconds * 1000)) {
            console.log(`[${extensionName}] 真实消息提醒已跳过 (通知间隔: ${debounceSeconds}s 内)`);
            return; // 在间隔内则退出
        }

        // 3. !! 关键：更新全局的上次通知时间戳 !!
        lastNotificationTimestamp = now;
        console.log(`[${extensionName}] 触发真实消息提醒流程... (更新时间戳: ${lastNotificationTimestamp})`); // 添加时间戳日志

        // 4. 获取平台信息
        const effectivePlatform = Platform.getEffectivePlatform();
        const isMobile = Platform.isMobilePlatform(effectivePlatform);

        // 5. 根据平台和设置触发提醒
        // a. 标题闪烁 (仅PC)
        if (!isMobile && Settings.getSetting('enableReminder')) { TitleFlash.startFlashing(); }
        // b. 系统通知 (所有平台)
        if (Settings.getSetting('enableNotification')) { await Notifications.sendNotification(); }
        // c. 震动 (仅移动端)
        if (isMobile && Settings.getSetting('enableVibration')) { MobileFeatures.triggerVibration(); }
    }
};

// --- 启动初始化 ---
jQuery(() => {
    const initDelay = 300; // 设置延迟
    setTimeout(() => { InitManager.init(); }, initDelay); // 延迟执行初始化
});