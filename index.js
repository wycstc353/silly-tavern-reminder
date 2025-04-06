// ====================================
// SillyTavern Reminder 扩展 - 后台脚本
// 包含: 新消息标题闪烁、系统通知、错误提示音、自定义声音等功能
// ====================================

// 导入SillyTavern核心功能 或 其他依赖
// 注意: 实际路径可能需要根据你的SillyTavern版本和文件结构调整
import { extension_settings, loadExtensionSettings } from "../../../extensions.js"; // 扩展设置读写相关
import { saveSettingsDebounced, eventSource, event_types } from "../../../../script.js"; // 防抖保存设置, 事件源, 事件类型
// import { getContext } from '../../../../scripts/context.js'; // 如果需要上下文信息 (例如非全局的toastr)
// import { someOtherFunction } from '../../../../script.js'; // 如果需要导入其他主脚本函数

// --- 常量与配置 ---

// 扩展名称 (应与扩展文件夹名称一致)
const extensionName = "silly-tavern-reminder";
// 扩展文件夹相对路径 (用于加载HTML/CSS)
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;
// 默认通知声音文件路径 (相对于 public 目录)
const defaultNotificationSoundPath = '/sounds/notification.mp3'; // 确保此文件存在于 public/sounds/
// 默认错误提示音文件路径 (相对于 public 目录)
const defaultErrorSoundPath = '/sounds/error.mp3'; // 确保此文件存在于 public/sounds/

// 扩展的默认设置
const defaultSettings = {
    enableReminder: true,          // 是否启用标题闪烁提醒 (布尔值)
    enableNotification: true,      // 是否启用新消息系统通知 (布尔值)
    enableErrorSound: true,        // 是否启用错误提示音 (布尔值)
    notificationSoundDataUrl: null, // 自定义通知声音的Data URL (字符串 或 null)
    errorSoundDataUrl: null,      // 自定义错误提示音的Data URL (字符串 或 null)
    notificationSoundFilename: '', // 自定义通知声音的文件名 (用于UI显示) (字符串)
    errorSoundFilename: '',        // 自定义错误提示音的文件名 (用于UI显示) (字符串)
};

// --- 音频管理器 (AudioManager) ---
// 负责加载、管理和播放通知音及错误提示音
const AudioManager = {
    notificationSound: null, // 通知音的 Audio 对象
    errorSound: null,      // 错误提示音的 Audio 对象
    defaultNotificationPath: defaultNotificationSoundPath, // 存储默认通知音路径
    defaultErrorPath: defaultErrorSoundPath,           // 存储默认错误音路径

    // 初始化音频对象，并根据设置加载初始声音源
    init() {
        this.notificationSound = new Audio();
        this.errorSound = new Audio();
        // 设置默认音量 (可按需调整)
        this.notificationSound.volume = 0.5;
        this.errorSound.volume = 0.5;

        // 根据当前设置加载声音 (依赖于 extension_settings 已被填充)
        // ?. 是可选链操作符，防止 extension_settings[extensionName] 不存在时报错
        this.updateNotificationSound(extension_settings[extensionName]?.notificationSoundDataUrl);
        this.updateErrorSound(extension_settings[extensionName]?.errorSoundDataUrl);
        console.log(`${extensionName}: AudioManager 初始化完成`);
    },

    // 更新通知音的音频源
    // 参数: dataUrl (string | null) - 自定义声音的Data URL，或 null 使用默认声音
    updateNotificationSound(dataUrl) {
        try {
            const newSrc = dataUrl || this.defaultNotificationPath;
            // 只有在源真正改变时才设置，避免不必要的加载
            if (this.notificationSound.src !== newSrc) {
                 this.notificationSound.src = newSrc;
                 console.log(`${extensionName}: 通知音源更新为 ${dataUrl ? '自定义' : '默认'}`);
            }
        } catch (err) {
            console.error(`${extensionName}: 设置通知音源时出错:`, err);
            this.notificationSound.src = this.defaultNotificationPath; // 出错时回退到默认
        }
    },

    // 更新错误提示音的音频源
    // 参数: dataUrl (string | null) - 自定义声音的Data URL，或 null 使用默认声音
    updateErrorSound(dataUrl) {
        try {
            const newSrc = dataUrl || this.defaultErrorPath;
             // 只有在源真正改变时才设置
             if (this.errorSound.src !== newSrc) {
                this.errorSound.src = newSrc;
                console.log(`${extensionName}: 错误音源更新为 ${dataUrl ? '自定义' : '默认'}`);
            }
        } catch (err) {
            console.error(`${extensionName}: 设置错误音源时出错:`, err);
            this.errorSound.src = this.defaultErrorPath; // 出错时回退到默认
        }
    },

    // 播放通知音 (如果通知功能已启用)
    playNotification() {
        // 检查总开关 和 音频对象/源 是否有效
        if (extension_settings[extensionName]?.enableNotification && this.notificationSound && this.notificationSound.src) {
            this.notificationSound.currentTime = 0; // 从头开始播放
            this.notificationSound.play().catch(err => console.error(`${extensionName}: 播放通知音失败:`, err));
        }
    },

    // 播放错误提示音 (如果错误提示音功能已启用)
    playError() {
        // 检查总开关 和 音频对象/源 是否有效
        if (extension_settings[extensionName]?.enableErrorSound && this.errorSound && this.errorSound.src) {
            this.errorSound.currentTime = 0; // 从头开始播放
            this.errorSound.play().catch(err => console.error(`${extensionName}: 播放错误提示音失败:`, err));
        }
    }
};

// --- 通知管理器 (NotificationManager) ---
// 负责处理浏览器桌面通知 (请求权限、发送通知)
const NotificationManager = {
    // 检查浏览器是否支持 Notification API
    checkSupport() {
        if (!("Notification" in window)) {
            console.warn(`${extensionName}: 此浏览器不支持桌面通知功能`);
            return false;
        }
        return true;
    },

    // 检查当前的通知权限状态 ('granted', 'denied', 'default')
    checkPermission() {
        return Notification.permission;
    },

    // 异步请求通知权限
    // 返回: Promise<boolean> - 是否已获得权限
    async requestPermission() {
        if (!this.checkSupport()) return false; // 不支持则直接返回 false

        try {
            // 调用浏览器 API 请求权限
            const permission = await Notification.requestPermission();
            console.log(`${extensionName}: 通知权限请求结果: ${permission}`);
            return permission === "granted"; // 返回是否成功获取权限
        } catch (error) {
            console.error(`${extensionName}: 请求通知权限时出错:`, error);
            return false; // 出错则认为未获取权限
        }
    },

    // 发送桌面通知
    // 参数: title (string), body (string), options (object) - 通知内容和选项
    // 返回: Promise<Notification | null> - 创建的 Notification 对象或 null
    async send(title = "SillyTavern 新消息", body = "您有新的消息", options = {}) {
        let notificationInstance = null;
        try {
            // 检查权限是否为 'granted' 并且用户在设置中启用了通知
            if (this.checkPermission() === "granted" && extension_settings[extensionName]?.enableNotification) {
                // 创建通知实例
                notificationInstance = new Notification(title, {
                    body: body,
                    icon: "/favicon.ico", // 使用SillyTavern的图标 (确保路径正确)
                    silent: true, // 设为 true，尝试阻止浏览器播放默认声音 (效果因浏览器而异)
                    ...options // 合并传入的其他选项
                });
                // 通知创建成功后，调用 AudioManager 播放声音
                AudioManager.playNotification();
            } else {
                // console.log(`${extensionName}: 未发送通知 (权限: ${this.checkPermission()}, 设置: ${extension_settings[extensionName]?.enableNotification})`);
            }
        } catch (error) {
            console.error(`${extensionName}: 发送通知时出错:`, error);
        }
        return notificationInstance; // 返回创建的通知对象，可能为 null
    },

    // 处理并通知错误
    // 参数: error (Error | any) - 捕获到的错误对象
    sendError(error) {
        const errorMessage = error?.message || error || '未知错误'; // 获取错误信息
        console.error(`${extensionName}: 捕获到错误:`, error); // 在控制台详细打印错误

        // 调用 AudioManager 播放错误提示音 (如果已启用)
        AudioManager.playError();

        // 注意：默认不再发送视觉上的错误通知弹窗，因为可能过于频繁或干扰
        // 如果需要，可以取消下面的注释
        /*
        this.send(
            "SillyTavern 发生错误",
            `错误信息: ${errorMessage.substring(0, 100)}...` // 截断过长的错误信息
        );
        */
    }
};

// --- 标题闪烁管理器 (TitleFlashManager) ---
// 负责在收到新消息且页面非激活状态时，闪烁浏览器标签页标题
const TitleFlashManager = {
    timer: null,            // 存储 setInterval 的 ID
    originalTitle: "",      // 存储原始页面标题
    isFlashing: false,      // 标记当前是否正在闪烁
    newMessageTitle: "【新消息】", // 闪烁时显示的文字 (可自定义)
    flashInterval: 1000,    // 闪烁间隔 (毫秒)

    // 开始闪烁
    start() {
        // 如果未启用标题提醒 或 已经在闪烁，则不执行
        if (!extension_settings[extensionName]?.enableReminder || this.isFlashing) return;

        this.isFlashing = true;
        this.originalTitle = document.title; // 保存当前标题
        // 设置定时器，交替显示新消息提示和原标题
        this.timer = setInterval(() => {
            document.title = (document.title === this.newMessageTitle) ? this.originalTitle : this.newMessageTitle;
        }, this.flashInterval);
    },

    // 停止闪烁
    stop() {
        if (this.timer) {
            clearInterval(this.timer); // 清除定时器
            this.timer = null;
        }
        // 只有在闪烁状态时才恢复标题，避免覆盖正常标题
        if (this.isFlashing) {
            document.title = this.originalTitle; // 恢复原始标题
        }
        this.isFlashing = false;
    }
};

// --- 页面可见性/焦点事件处理 ---
// 用于在用户切换回标签页时停止标题闪烁

// 当页面可见性改变时触发 (例如，切换标签页)
const handleVisibilityChange = () => {
    // 如果页面变为可见 (document.hidden 为 false) 并且当前正在闪烁
    if (!document.hidden && TitleFlashManager.isFlashing) {
        TitleFlashManager.stop(); // 停止闪烁
    }
};

// 当窗口获得焦点时触发 (例如，点击浏览器窗口)
const handleWindowFocus = () => {
    // 如果窗口获得焦点并且当前正在闪烁
    if (TitleFlashManager.isFlashing) {
        TitleFlashManager.stop(); // 停止闪烁
    }
};

// 添加事件监听器
document.addEventListener('visibilitychange', handleVisibilityChange);
window.addEventListener('focus', handleWindowFocus);

// --- 设置管理器 (SettingsManager) ---
// 负责加载、保存扩展设置，并更新UI界面
const SettingsManager = {
    // 加载设置 (通常在初始化时调用)
    // 确保设置对象存在，并合并默认值
    load() {
        // 确保 extension_settings 中有该扩展的条目
        extension_settings[extensionName] = extension_settings[extensionName] || {};
        let settingsChanged = false;
        // 遍历默认设置，如果当前设置中缺少某项，则用默认值填充
        for (const key in defaultSettings) {
            if (extension_settings[extensionName][key] === undefined) {
                extension_settings[extensionName][key] = defaultSettings[key];
                settingsChanged = true; // 标记设置已更改
            }
        }
        // 如果加载时补充了默认设置，则保存一次
        if (settingsChanged) {
             console.log(`${extensionName}: 首次加载或补充默认设置，进行保存。`);
             saveSettingsDebounced();
        }
        // 加载设置后，更新UI显示
        this.updateUI();
        console.log(`${extensionName}: 设置加载完成`);
    },

    // 更新前端设置界面的显示状态
    updateUI() {
        const settings = extension_settings[extensionName];
        if (!settings) return; // 如果设置尚未加载，则退出

        // 更新复选框状态
        $("#title_reminder_setting").prop("checked", settings.enableReminder);
        $("#notification_setting").prop("checked", settings.enableNotification);
        $("#error_sound_setting").prop("checked", settings.enableErrorSound);

        // 更新显示的文件名
        $("#notification_sound_filename").text(settings.notificationSoundFilename || '默认'); // 显示文件名，否则显示 '默认'
        $("#error_sound_filename").text(settings.errorSoundFilename || '默认');

        // 根据父复选框状态，启用/禁用文件选择相关控件
        const notificationControlsDisabled = !settings.enableNotification;
        $("#notification_sound_file, #clear_notification_sound").prop("disabled", notificationControlsDisabled);

        const errorControlsDisabled = !settings.enableErrorSound;
        $("#error_sound_file, #clear_error_sound").prop("disabled", errorControlsDisabled);
    },

    // 保存单个设置项
    // 参数: key (string) - 设置项的键名
    // 参数: value (any) - 设置项的值
    save(key, value) {
        if (extension_settings[extensionName]) {
            extension_settings[extensionName][key] = value;
            saveSettingsDebounced(); // 调用防抖函数保存所有设置
            console.log(`${extensionName}: 保存设置 ${key} = ${value}`);
            this.updateUI(); // 保存后立即更新UI，确保状态一致
        }
    },

    // 处理用户选择的音频文件
    // 参数: file (File) - 用户选择的文件对象
    // 参数: type ('notification' | 'error') - 声音类型
    saveSoundFile(file, type) {
        // 简单验证文件类型
        if (!file || !file.type.startsWith('audio/')) {
            toastr.error('请选择有效的音频文件 (例如 .mp3, .wav, .ogg)。');
            $(`#${type}_sound_file`).val(''); // 清空文件输入框的显示值
            return;
        }

        // 限制文件大小 (例如 5MB)，防止设置文件过大
        const maxSizeMB = 5;
        if (file.size > maxSizeMB * 1024 * 1024) {
             toastr.error(`文件过大，请选择小于 ${maxSizeMB}MB 的音频文件。`);
             $(`#${type}_sound_file`).val(''); // 清空文件输入框
             return;
        }


        const reader = new FileReader(); // 创建 FileReader 读取文件

        // 文件读取成功时的回调
        reader.onload = (e) => {
            const dataUrl = e.target.result; // 获取文件的 Data URL
            const filename = file.name;      // 获取文件名
            const dataUrlKey = `${type}SoundDataUrl`; // 构造设置中的键名
            const filenameKey = `${type}SoundFilename`; // 构造设置中的键名

            // 保存 Data URL 和 文件名到设置中
            extension_settings[extensionName][dataUrlKey] = dataUrl;
            extension_settings[extensionName][filenameKey] = filename;
            saveSettingsDebounced(); // 保存设置

            // 更新 AudioManager 中的声音源
            if (type === 'notification') {
                AudioManager.updateNotificationSound(dataUrl);
            } else if (type === 'error') {
                AudioManager.updateErrorSound(dataUrl);
            }

            this.updateUI(); // 更新界面显示 (文件名等)
            toastr.success(`${type === 'notification' ? '提醒' : '错误'}声音 "${filename}" 已设置`);
        };

        // 文件读取失败时的回调
        reader.onerror = (e) => {
            console.error(`${extensionName}: 读取文件时出错:`, e);
            toastr.error('读取文件时出错，请重试。');
            $(`#${type}_sound_file`).val(''); // 清空文件输入框
        };

        // 开始读取文件内容为 Data URL
        reader.readAsDataURL(file);
    },

     // 清除自定义声音设置，恢复默认
     // 参数: type ('notification' | 'error') - 声音类型
     clearSoundFile(type) {
        const dataUrlKey = `${type}SoundDataUrl`;
        const filenameKey = `${type}SoundFilename`;

        // 将设置中的 Data URL 和 文件名清空 (设为 null 或空字符串)
        extension_settings[extensionName][dataUrlKey] = null;
        extension_settings[extensionName][filenameKey] = '';
        saveSettingsDebounced(); // 保存设置

         // 更新 AudioManager 中的声音源 (传入 null 会使其使用默认路径)
         if (type === 'notification') {
            AudioManager.updateNotificationSound(null);
            $(`#notification_sound_file`).val(''); // 清空文件输入框的显示值
        } else if (type === 'error') {
            AudioManager.updateErrorSound(null);
            $(`#error_sound_file`).val(''); // 清空文件输入框的显示值
        }

        this.updateUI(); // 更新界面显示
        toastr.info(`${type === 'notification' ? '提醒' : '错误'}声音已恢复默认`);
    }
};

// --- 事件处理器 (EventHandler) ---
// 负责处理前端设置界面上的用户交互事件 (点击、更改)
const EventHandler = {
    // 处理 "启用新消息标题提醒" 复选框的更改事件
    onReminderToggle(event) {
        SettingsManager.save('enableReminder', Boolean($(event.target).prop("checked")));
    },

    // 处理 "启用新消息系统提醒" 复选框的更改事件
    async onNotificationToggle(event) {
        const isChecked = Boolean($(event.target).prop("checked"));
        const currentPermission = NotificationManager.checkPermission();

        // 如果用户尝试启用，但权限已被明确拒绝
        if (isChecked && currentPermission === "denied") {
            toastr.error('通知权限已被浏览器拒绝。请在浏览器设置中手动开启此网站的通知权限。');
            $(event.target).prop("checked", false); // 将复选框恢复为未选中
            SettingsManager.updateUI(); // 确保UI状态一致（禁用文件选择等）
            return; // 阻止后续操作
        }

        // 如果用户尝试启用，但权限尚未授予 (是 'default' 状态)
        // 并且事件不是由代码触发的 (event.isTrigger === undefined)
        if (isChecked && currentPermission !== "granted" && event.isTrigger === undefined) {
            toastr.info('启用系统通知需要浏览器授权...'); // 提示用户
            const granted = await NotificationManager.requestPermission(); // 请求权限
            if (!granted) {
                // 如果用户拒绝了权限请求
                toastr.warning('未获得通知权限，系统通知功能将无法使用。');
                $(event.target).prop("checked", false); // 将复选框恢复为未选中
                SettingsManager.updateUI(); // 确保UI状态一致
                return; // 阻止保存设置
            }
            // 如果用户同意了权限，则继续执行保存逻辑
            toastr.success('已获得通知权限！');
        }

        // 保存设置 (无论之前是否请求了权限，只要走到了这里就保存)
        SettingsManager.save('enableNotification', isChecked);
        // UI 更新（包括相关控件的禁用/启用状态）由 SettingsManager.save() -> updateUI() 处理
    },

    // 处理 "启用错误提示音" 复选框的更改事件
    onErrorSoundToggle(event) {
        const isChecked = Boolean($(event.target).prop("checked"));
        SettingsManager.save('enableErrorSound', isChecked);
        // UI 更新由 SettingsManager.save() -> updateUI() 处理
    },

    // 处理文件选择输入框的 'change' 事件
    // 参数: event (Event) - DOM 事件对象
    // 参数: type ('notification' | 'error') - 声音类型
    onFileSelected(event, type) {
        const file = event.target.files[0]; // 获取选中的第一个文件
        if (file) {
            SettingsManager.saveSoundFile(file, type); // 调用设置管理器处理文件
        }
        // 注意：选择文件后，输入框的值理论上保留，直到用户清除或选择新文件
        // 清空操作在 saveSoundFile 失败时，或 clearSoundFile 时执行
    },

    // 处理 "默认" 按钮的点击事件
    // 参数: type ('notification' | 'error') - 声音类型
    onClearSoundClick(type) {
        SettingsManager.clearSoundFile(type); // 调用设置管理器清除设置
    },

    // 处理 "申请通知权限" 按钮的点击事件
    async onRequestPermissionClick() {
        // 检查浏览器是否支持
        if (!NotificationManager.checkSupport()) {
            toastr.error('抱歉，您的浏览器不支持桌面通知功能。');
            return;
        }

        const currentPermission = NotificationManager.checkPermission();
        // 如果权限已被拒绝
        if (currentPermission === "denied") {
            toastr.error('通知权限已被浏览器拒绝。请在浏览器地址栏左侧或设置中，手动为此网站开启通知权限。');
            return;
        }
        // 如果权限已经是 granted
        if (currentPermission === "granted") {
             toastr.info('您已授予通知权限。');
             // 可以选择发送一个测试通知
             new Notification("权限测试", { body: "通知权限工作正常！", icon: "/favicon.ico", silent: true });
             AudioManager.playNotification(); // 也测试一下声音
             return;
        }

        // 如果权限是 'default'，则请求权限
        toastr.info('正在请求浏览器通知权限...');
        const granted = await NotificationManager.requestPermission();
        if (granted) {
            toastr.success('成功获得通知权限！');
            // 发送测试通知
             new Notification("权限测试", { body: "通知权限工作正常！", icon: "/favicon.ico", silent: true });
             AudioManager.playNotification();
            // 权限获取成功后，确保设置界面的复选框是勾选状态
            if (!$("#notification_setting").prop("checked")) {
                 $("#notification_setting").prop("checked", true);
                 SettingsManager.save('enableNotification', true); // 保存设置并更新UI
            }
        } else {
            toastr.warning('未获得通知权限，系统通知功能将无法使用。');
            // 如果请求后权限不是 granted (可能是 default 或 denied)，确保复选框不被勾选
             if (NotificationManager.checkPermission() !== 'granted') {
                $("#notification_setting").prop("checked", false);
                SettingsManager.save('enableNotification', false); // 保存设置并更新UI
             }
        }
    }
};

// --- 消息处理器 (MessageHandler) ---
// 监听来自 SillyTavern 的新消息事件，并根据需要触发提醒
const MessageHandler = {
    // 判断是否需要发送提醒 (标题闪烁 或 系统通知)
    // 条件：页面在后台 (隐藏) 或 页面在前台但窗口失去焦点
    shouldSendReminder() {
        return document.hidden || !document.hasFocus();
    },

    // 处理接收到的新消息事件
    // 参数: data (object) - 事件传递的数据 (具体内容取决于事件源)
    async handleIncomingMessage(data) {
        // 检查是否满足提醒条件
        const needReminder = this.shouldSendReminder();

        if (needReminder) {
            // console.log(`${extensionName}: 检测到新消息且页面非激活，触发提醒`);
            // 1. 触发标题闪烁 (如果已启用)
            TitleFlashManager.start();

            // 2. 发送系统通知 (如果已启用)
            // NotificationManager.send() 内部会检查权限和设置，并播放声音
            await NotificationManager.send();
        }
    }
};

// 监听 SillyTavern 的 'MESSAGE_RECEIVED' 事件
// 当新消息完全生成并添加到聊天时触发 (需要确认 script.js 中的确切事件名)
// 使用 .bind(MessageHandler) 确保 handleIncomingMessage 内部的 this 指向 MessageHandler 对象
eventSource.on(event_types.MESSAGE_RECEIVED, MessageHandler.handleIncomingMessage.bind(MessageHandler));
// 如果有其他相关事件需要监听，可以在这里添加，例如:
// eventSource.on(event_types.STREAMING_ENDED, MessageHandler.handleIncomingMessage.bind(MessageHandler));


// --- 错误处理器 (ErrorHandler) ---
// 捕获全局 JavaScript 错误，并触发错误提醒 (声音)
const ErrorHandler = {
    init() {
        // 捕获未处理的 Promise 拒绝错误
        window.addEventListener('unhandledrejection', (event) => {
            console.warn(`${extensionName}: 捕获到未处理的 Promise 拒绝:`, event.reason);
            NotificationManager.sendError(event.reason || 'Unhandled Promise Rejection');
        });

        // 捕获全局运行时错误 (同步错误)
        window.addEventListener('error', (event) => {
            // 避免捕获非脚本错误（例如资源加载失败）触发声音
            if (event.error) {
                 console.warn(`${extensionName}: 捕获到全局运行时错误:`, event.error);
                 NotificationManager.sendError(event.error || event.message || 'Global Error');
            } else {
                // console.log(`${extensionName}: 捕获到非脚本错误事件:`, event.message);
            }
        });
        console.log(`${extensionName}: 全局错误处理器初始化完成`);
    }
};

// --- 初始化管理器 (InitManager) ---
// 负责扩展的整体初始化流程
const InitManager = {
    async init() {
        console.log(`${extensionName}: 开始初始化...`);
        try {
            // 1. **加载/确保设置**: 确保设置对象存在并包含默认值
            //    SillyTavern 的扩展加载机制通常会处理 loadExtensionSettings。
            //    我们在这里调用 SettingsManager.load() 来合并默认值并更新UI。
            //    这假设 extension_settings[extensionName] 在此之前已由 ST 核心填充（即使是空对象）。
             SettingsManager.load(); // 合并默认值并准备好设置对象

            // 2. **初始化依赖设置的模块**: 例如 AudioManager 需要读取设置来加载初始声音
            ErrorHandler.init(); // 尽早初始化错误捕获
            AudioManager.init(); // 初始化音频，加载默认或自定义声音

            // 3. **加载并注入 HTML**: 从 reminder.html 文件加载界面代码
            console.log(`${extensionName}: 加载 HTML...`);
            const settingsHtml = await $.get(`${extensionFolderPath}/reminder.html`);
            $("#extensions_settings2").append(settingsHtml); // 将HTML添加到设置页面的指定位置
            console.log(`${extensionName}: HTML 注入完成`);

            // 4. **加载并注入 CSS**: 添加扩展的样式表
            //    确保 CSS 文件存在于 `extensionFolderPath` 下名为 style.css
            const cssPath = `${extensionFolderPath}/style.css`;
            // 检查是否已存在相同 CSS，避免重复添加
            if (!$(`link[href="${cssPath}"]`).length) {
                console.log(`${extensionName}: 加载 CSS...`);
                const styleSheet = document.createElement('link');
                styleSheet.rel = 'stylesheet';
                styleSheet.type = 'text/css';
                styleSheet.href = cssPath;
                document.head.appendChild(styleSheet);
                 console.log(`${extensionName}: CSS 注入完成`);
            }


            // 5. **绑定事件监听器**: 将 UI 元素与 EventHandler 中的处理函数关联起来
            console.log(`${extensionName}: 绑定事件监听器...`);
            // 使用 'change' 事件监听复选框更可靠
            $("#title_reminder_setting").on("change", EventHandler.onReminderToggle);
            $("#notification_setting").on("change", EventHandler.onNotificationToggle);
            $("#error_sound_setting").on("change", EventHandler.onErrorSoundToggle);
            // 文件选择输入框
            $("#notification_sound_file").on("change", (event) => EventHandler.onFileSelected(event, 'notification'));
            $("#error_sound_file").on("change", (event) => EventHandler.onFileSelected(event, 'error'));
            // 清除按钮
            $("#clear_notification_sound").on("click", () => EventHandler.onClearSoundClick('notification'));
            $("#clear_error_sound").on("click", () => EventHandler.onClearSoundClick('error'));
            // 权限申请按钮
            $("#request_notification_permission").on("click", EventHandler.onRequestPermissionClick);
            console.log(`${extensionName}: 事件监听器绑定完成`);

            // 6. **更新UI**: 在 HTML 加载和事件绑定后，根据当前设置再次更新 UI 状态
            //    这一步很重要，确保页面加载时显示正确的设置状态
            SettingsManager.updateUI();
            console.log(`${extensionName}: UI 状态已根据设置更新`);

            // 7. **初始状态检查 (可选)**: 可以在这里检查并打印一些初始状态信息
            console.log(`${extensionName}: 通知权限初始状态: ${NotificationManager.checkPermission()}`);

            console.log(`%c${extensionName}: 初始化成功完成！`, "color: lightgreen; font-weight: bold;");

        } catch (error) {
            console.error(`${extensionName}: 初始化过程中发生严重错误:`, error);
            // 可以在这里添加一个更明显的错误提示给用户，例如使用 toastr
            toastr.error(`扩展 ${extensionName} 初始化失败，请检查控制台日志。`, "扩展错误", { timeOut: 10000 });
        }
    }
};

// --- 启动初始化 ---
// 使用 jQuery 的 document ready 功能，确保 DOM 加载完成后再执行初始化
jQuery(() => {
    // 添加一个短暂的延迟 (例如 200-500 毫秒)
    // 目的是给 SillyTavern 核心脚本更多时间来完成其自身的初始化，
    // 尤其是确保 `extension_settings` 对象已准备好。
    // 这个延迟不是绝对保证，但可以提高在某些情况下的稳定性。
    const initDelay = 300; // 毫秒
    console.log(`${extensionName}: DOM Ready. 等待 ${initDelay}ms 后开始初始化...`);
    setTimeout(() => {
        InitManager.init();
    }, initDelay);
});
