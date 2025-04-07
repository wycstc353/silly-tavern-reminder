// 文件名: index.js
// 职责: 扩展主入口，加载所有模块，执行初始化流程，绑定 UI 事件和核心事件，协调各模块功能

// --- 核心依赖导入 ---
// 从 SillyTavern 核心导入扩展设置对象和加载函数
import { extension_settings } from "../../../extensions.js";
// 从 SillyTavern 核心导入防抖保存设置函数、事件源和事件类型
import { saveSettingsDebounced, eventSource, event_types } from "../../../../script.js";
// 假设 toastr (消息提示库) 在全局作用域可用
// declare var toastr: any; // 可用于 TypeScript 或 JSDoc 类型提示

// --- 自定义模块导入 ---
// 使用 import * as ... from '...' 导入所有导出的成员
import * as Settings from './settings.js';         // 设置管理模块
import * as Audio from './audio.js';               // 音频管理模块
import * as Notifications from './notifications.js'; // 系统通知模块
import * as TitleFlash from './title_flash.js';      // 标题闪烁模块
import * as Platform from './platform.js';           // 平台检测模块
import * as MobileFeatures from './mobile_features.js'; // 移动特性模块 (震动)
import * as ErrorHandler from './error_handler.js';   // 全局错误处理模块

// --- 常量定义 ---
const extensionName = "silly-tavern-reminder"; // 扩展名称，用于日志和设置键
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`; // 扩展文件夹路径，用于加载 HTML/CSS

// --- 状态变量 ---
// 用于通知去重的时间戳，记录上次发送通知（包括真实消息和测试按钮触发）的时间
// !! 这个变量是全局的，由 MessageHandler 和 EventHandler 共享和更新 !!
let lastNotificationTimestamp = 0;

// --- 初始化管理器对象 ---
// 封装扩展初始化所需的所有步骤
const InitManager = {
    /**
     * 异步执行初始化流程
     * 按顺序执行平台检测、设置加载、模块初始化、界面加载、事件绑定等
     */
    async init() {
        console.log(`%c[${extensionName}] 开始初始化...`, "color: blue; font-weight: bold;"); // 打印醒目的初始化开始日志
        try {
            // 1. !! 关键步骤：首先进行平台检测 !!
            // 因为后续的设置加载和 UI 更新可能依赖平台信息
            Platform.initPlatform(); // 调用平台模块的初始化函数

            // 2. 加载扩展设置
            // 调用 settings.js 中的 loadSettings 函数，传入扩展名
            Settings.loadSettings(extensionName);

            // 3. 初始化音频管理器
            // 调用 audio.js 中的 initAudio 函数，创建 Audio 对象并加载声音
            Audio.initAudio();

            // 4. 初始化标题闪烁管理器
            // 调用 title_flash.js 中的 initTitleFlash，添加页面可见性和焦点事件监听器
            // (标题闪烁逻辑本身会在 startFlashing 中根据平台判断是否执行)
            TitleFlash.initTitleFlash();

            // 5. 初始化全局错误处理器
            // 调用 error_handler.js 中的 initErrorHandler，并传入依赖：播放错误声音的函数
            ErrorHandler.initErrorHandler({ playError: Audio.playError });

            // 6. 加载并注入 HTML 用户界面
            // await 等待 loadInterface 异步函数完成
            await this.loadInterface();

            // 7. 绑定用户界面上的事件监听器
            // 将 HTML 元素（按钮、复选框等）与 JavaScript 处理函数关联起来
            this.bindUIEvents();

            // 8. !! 关键步骤：更新用户界面初始状态 !!
            // 在 HTML 加载完成、事件绑定之后，调用 updateUISettings 根据当前设置刷新界面显示
            Settings.updateUISettings();

            // 9. 绑定 SillyTavern 核心事件监听器
            // 主要是监听新消息事件
            this.bindCoreEvents();

            // 初始化成功，打印日志和重要状态信息
            console.log(`%c[${extensionName}] 初始化成功完成！`, "color: lightgreen; font-weight: bold;");
            console.log(`[${extensionName}] 自动检测平台: ${Platform.detectedPlatform}, 当前生效平台: ${Platform.getEffectivePlatform()}`);
            console.log(`[${extensionName}] 通知权限初始状态: ${Notifications.checkPermission()}`);

        } catch (error) {
             // 捕获初始化过程中的任何未预期错误
             console.error(`%c[${extensionName}] 初始化过程中发生严重错误:`, "color: red; font-weight: bold;", error);
             // 尝试使用 toastr 库向用户显示错误提示
             this.showErrorToast(`扩展 ${extensionName} 初始化失败，请检查浏览器控制台日志获取详细信息。`);
        }
    },

    /**
     * 异步加载 HTML 界面文件和可选的 CSS 样式文件
     */
    async loadInterface() {
        try {
            // 打印加载 HTML 日志
            console.log(`[${extensionName}] 加载 HTML (${extensionFolderPath}/reminder.html)...`);
            // 使用 jQuery 的 $.get 方法异步获取 HTML 文件内容
            const settingsHtml = await $.get(`${extensionFolderPath}/reminder.html`);
            // 查找 SillyTavern 中用于放置扩展设置的 DOM 容器
            const targetContainer = $("#extensions_settings2");
            // 如果找不到该容器，打印警告并返回，防止后续错误
            if (!targetContainer.length) {
                 console.warn(`[${extensionName}] 无法找到设置注入点 #extensions_settings2，HTML 未加载。`);
                 return;
            }
            // 将获取到的 HTML 字符串追加到目标容器中
            targetContainer.append(settingsHtml);
            console.log(`[${extensionName}] HTML 注入完成`);

            // 尝试加载可选的 CSS 文件
            const cssPath = `${extensionFolderPath}/style.css`;
            // 检查页面是否已经加载了同名的 CSS 文件，避免重复注入
            if (!$(`link[href="${cssPath}"]`).length) {
                 // 使用 fetch API 尝试获取 CSS 文件。
                 fetch(cssPath)
                     .then(response => {
                         // 检查 HTTP 响应状态是否表示成功 (例如 200 OK)
                         if(response.ok) {
                             console.log(`[${extensionName}] 加载 CSS (${cssPath})...`);
                             // 创建一个新的 <link> 元素
                             const link = document.createElement('link');
                             link.rel = 'stylesheet'; // 设置 rel 属性为 stylesheet
                             link.type = 'text/css';  // 设置 type 属性为 text/css
                             link.href = cssPath;     // 设置 href 属性为 CSS 文件路径
                             // 将创建的 <link> 元素添加到文档的 <head> 部分
                             document.head.appendChild(link);
                             console.log(`[${extensionName}] CSS 注入完成`);
                         }
                         // 如果 CSS 文件不存在或加载失败 (例如 404 Not Found)，则不执行任何操作 (静默失败)
                     })
                     .catch(()=>{ /* 捕获 fetch 可能发生的网络错误等，静默处理 */ });
            }
        } catch (error) {
             // 捕获加载 HTML 或 CSS 过程中可能发生的错误 (例如网络问题、文件读取错误)
             console.error(`[${extensionName}] 加载界面 (HTML/CSS) 时出错:`, error);
             // 尝试使用 toastr 提示用户界面加载失败
             this.showErrorToast(`加载 ${extensionName} 扩展界面失败。`);
        }
    },

    /**
     * 绑定设置界面上各 UI 元素的事件监听器
     * 使用事件委托将监听器绑定到父容器上，提高效率并处理动态内容
     */
    bindUIEvents() {
         console.log(`[${extensionName}] 绑定 UI 事件监听器...`);
        // 获取包含所有设置项的顶层 div 元素
        const settingsContainer = $(".reminder-extension-settings");
        // 如果找不到容器，记录错误并返回，无法绑定事件
        if (!settingsContainer.length) {
            console.error(`[${extensionName}] 无法找到设置容器 .reminder-extension-settings，UI 事件未绑定！`);
            return;
        }

        // --- 绑定通用设置区域的事件 ---
        // 监听 #enableReminder 复选框的 'change' 事件
        settingsContainer.on("change", "#enableReminder", (event) => Settings.saveSetting('enableReminder', $(event.target).prop("checked")));
        // 监听 #platformOverride 下拉框的 'change' 事件
        settingsContainer.on("change", "#platformOverride", (event) => {
            Settings.saveSetting('platformOverride', $(event.target).val()); // 保存新选择的值
            Settings.updateUISettings(); // 立即更新 UI 以反映平台变化（例如显示/隐藏移动设置）
            console.log(`[${extensionName}] 用户更改平台模式, 当前生效: ${Platform.getEffectivePlatform()}`); // 记录日志
        });
        // 监听 #request_notification_permission 按钮的 'click' 事件，调用 EventHandler 中的处理函数
        settingsContainer.on("click", "#request_notification_permission", EventHandler.onRequestPermissionClick);

        // --- 绑定系统通知 & 声音区域的事件 ---
        // 监听 #enableNotification 复选框的 'change' 事件，调用特殊处理函数（涉及权限）
        settingsContainer.on("change", "#enableNotification", EventHandler.onNotificationToggle);
        // 监听 #notificationDebounceSeconds 数字输入框的 'change' 事件
        settingsContainer.on("change", "#notificationDebounceSeconds", (event) => Settings.saveSetting('notificationDebounceSeconds', $(event.target).val()));
        // 监听 #notification_sound_file 文件选择框的 'change' 事件
        settingsContainer.on("change", "#notification_sound_file", (event) => EventHandler.onFileSelected(event, 'notification'));
        // 监听 #clear_notification_sound 清除按钮的 'click' 事件
        settingsContainer.on("click", "#clear_notification_sound", () => EventHandler.clearSoundFile('notification'));

        // --- 绑定错误提示区域的事件 ---
        // 监听 #enableErrorSound 复选框的 'change' 事件
        settingsContainer.on("change", "#enableErrorSound", (event) => Settings.saveSetting('enableErrorSound', $(event.target).prop("checked")));
        // 监听 #error_sound_file 文件选择框的 'change' 事件
        settingsContainer.on("change", "#error_sound_file", (event) => EventHandler.onFileSelected(event, 'error'));
        // 监听 #clear_error_sound 清除按钮的 'click' 事件
        settingsContainer.on("click", "#clear_error_sound", () => EventHandler.clearSoundFile('error'));

        // --- 绑定移动端专属设置区域的事件 ---
        // (这些控件默认隐藏，但监听器始终有效)
        // 监听 #mobileNotificationBehavior 下拉框的 'change' 事件
        settingsContainer.on("change", "#mobileNotificationBehavior", (event) => Settings.saveSetting('mobileNotificationBehavior', $(event.target).val()));
        // 监听 #enableVibration 复选框的 'change' 事件
        settingsContainer.on("change", "#enableVibration", (event) => Settings.saveSetting('enableVibration', $(event.target).prop("checked")));

         console.log(`[${extensionName}] UI 事件监听器绑定完成`); // 打印完成日志
    },

    /**
     * 绑定 SillyTavern 核心事件监听器
     */
    bindCoreEvents() {
        console.log(`[${extensionName}] 绑定核心事件 (MESSAGE_RECEIVED)...`);
        // 使用 SillyTavern 的全局 eventSource 对象监听 'MESSAGE_RECEIVED' 事件
        // 当新消息完全生成并添加到聊天时，会调用 MessageHandler.handleIncomingMessage 函数
        eventSource.on(event_types.MESSAGE_RECEIVED, MessageHandler.handleIncomingMessage);
        // (可以根据需要在此处监听其他 event_types 事件)
        console.log(`[${extensionName}] 核心事件绑定完成`);
    },

    /**
     * 辅助函数：显示错误提示信息 (使用 toastr 库)
     * @param {string} message - 要显示的消息内容
     * @param {string} [title="扩展错误"] - 提示的标题 (可选)
     */
    showErrorToast(message, title = "扩展错误") {
         try {
            // 检查全局作用域中是否存在 toastr 对象及其 error 方法
            if (typeof toastr !== 'undefined' && toastr.error) {
                // 调用 toastr.error 显示错误提示，设置较长的显示时间 (10秒)
                toastr.error(message, title, { timeOut: 10000 });
            } else {
                 // 如果 toastr 不可用，则在控制台打印错误信息
                 console.error(`[${extensionName}] Toastr 不可用，无法显示错误: ${message}`);
            }
        } catch (e) {
            // 处理调用 toastr 时本身可能发生的异常
            console.error(`[${extensionName}] 显示 Toastr 错误时失败:`, e);
        }
    }
};

// --- UI 事件处理器对象 ---
// 包含处理特定 UI 交互逻辑（如文件上传、权限请求）的函数集合
const EventHandler = {
    /**
     * 处理 "启用新消息系统提醒" 复选框的 'change' 事件
     * - 检查并处理通知权限：拒绝时阻止勾选，默认时请求权限
     * - 保存最终的开关状态
     * @param {Event} event - DOM change 事件对象
     */
    async onNotificationToggle(event) {
        const isChecked = $(event.target).prop("checked"); // 获取当前是否勾选
        const currentPermission = Notifications.checkPermission(); // 获取当前权限状态

        // 情况1: 尝试勾选，但权限已被拒绝
        if (isChecked && currentPermission === "denied") {
            toastr.error('通知权限已被浏览器拒绝。请在浏览器设置中手动开启。');
            $(event.target).prop("checked", false); // 强制取消勾选
            Settings.updateUISettings(); // 更新UI（例如相关控件的禁用状态）
            return; // 结束处理
        }

        // 情况2: 尝试勾选，权限是默认状态 (需要请求)，且非代码触发
        if (isChecked && currentPermission === "default" && event.isTrigger === undefined) {
            toastr.info('请求浏览器通知授权...');
            const granted = await Notifications.requestPermission(); // 异步请求权限
            if (!granted) { // 如果用户拒绝了权限
                toastr.warning('未获得通知权限。');
                $(event.target).prop("checked", false); // 强制取消勾选
                Settings.updateUISettings(); // 更新UI
                return; // 结束处理
            } else { // 如果用户授予了权限
                toastr.success('已获得通知权限！');
                // 继续向下执行，保存勾选状态
            }
        }

        // 情况3: 用户取消勾选，或已获得权限后勾选/取消勾选
        Settings.saveSetting('enableNotification', isChecked); // 保存设置
        // UI 更新将由 saveSetting -> updateUISettings 自动处理
    },

    /**
     * 处理文件选择输入框的 'change' 事件
     * - 验证文件类型和大小
     * - 读取文件为 Data URL
     * - 保存设置并更新音频播放器
     * @param {Event} event - DOM change 事件对象
     * @param {'notification' | 'error'} type - 指示是通知声音还是错误声音
     */
    onFileSelected(event, type) {
        const file = event.target.files[0]; // 获取选中的文件
        if (!file) return; // 未选择文件则退出

        // 验证 MimeType 是否为音频
        if (!file.type.startsWith('audio/')) {
            toastr.error('请选择有效的音频文件。'); $(event.target).val(''); return; // 提示并清空选择
        }
        // 验证文件大小
        const maxSizeMB = 5;
        if (file.size > maxSizeMB * 1024 * 1024) {
             toastr.error(`文件需小于 ${maxSizeMB}MB。`); $(event.target).val(''); return; // 提示并清空选择
        }
        // 创建 FileReader 读取文件
        const reader = new FileReader();
        // 设置读取成功的回调
        reader.onload = (e) => {
            const dataUrl = e.target.result; // 获取 Data URL
            const filename = file.name;      // 获取文件名
            // 保存 Data URL 和 文件名到设置
            Settings.saveSetting(`${type}SoundDataUrl`, dataUrl);
            Settings.saveSetting(`${type}SoundFilename`, filename); // 保存文件名，会触发UI更新
            // 更新对应的 Audio 元素源
            if (type === 'notification') Audio.updateNotificationSound(dataUrl);
            else Audio.updateErrorSound(dataUrl);
            // 显示成功提示
            toastr.success(`${type === 'notification' ? '提醒' : '错误'}声音 "${filename}" 已设置`);
        };
        // 设置读取失败的回调
        reader.onerror = (e) => {
            toastr.error(`读取文件 "${file.name}" 出错。`); $(event.target).val(''); // 提示并清空选择
        };
        // 开始读取
        reader.readAsDataURL(file);
    },

    /**
     * 处理 "默认" 按钮的 'click' 事件，用于清除自定义声音
     * @param {'notification' | 'error'} type - 声音类型
     */
    clearSoundFile(type) {
        // 清空设置中的 Data URL 和 文件名
        Settings.saveSetting(`${type}SoundDataUrl`, null);
        Settings.saveSetting(`${type}SoundFilename`, ''); // 清空文件名，会触发UI更新
        // 更新 Audio 元素使用默认源，并清空文件输入框
        if (type === 'notification') { Audio.updateNotificationSound(null); $(`#notification_sound_file`).val(''); }
        else { Audio.updateErrorSound(null); $(`#error_sound_file`).val(''); }
        toastr.info(`${type === 'notification' ? '提醒' : '错误'}声音已恢复默认`);
    },

    /**
     * !! 修正后的函数：处理 "申请/测试系统通知权限" 按钮的 'click' 事件 !!
     * - 检查浏览器支持和当前权限状态
     * - 根据状态进行提示、请求权限或发送测试通知
     * - !! 关键：发送测试通知/声音前会检查通知间隔设置 !!
     * - !! 关键：如果间隔允许，会先更新 lastNotificationTimestamp，再尝试发送/播放 !!
     * - 同步更新通知总开关 (#enableNotification) 的状态并保存设置
     */
    async onRequestPermissionClick() {
        // 1. 检查浏览器是否支持 Notification API
        if (!Notifications.checkSupport()) { toastr.error('浏览器不支持通知。'); return; }
        // 2. 获取当前权限状态
        const currentPermission = Notifications.checkPermission();

        // 3. --- 定义检查通知间隔的辅助函数 ---
        const checkDebounce = () => {
            const debounceSeconds = Settings.getSetting('notificationDebounceSeconds') || 0; // 获取间隔设置
            const now = Date.now(); // 获取当前时间
            // 检查当前时间与上次通知时间戳的差值是否小于设定的间隔
            if (debounceSeconds > 0 && (now - lastNotificationTimestamp < debounceSeconds * 1000)) {
                console.log(`[${extensionName}] 测试通知/声音已跳过 (通知间隔: ${debounceSeconds}s 内)`);
                // 如果在间隔内，显示提示并返回 true (表示需要跳过)
                toastr.info(`测试通知已跳过 (在 ${debounceSeconds} 秒的间隔内)`);
                return true;
            }
            return false; // 返回 false 表示可以继续
        };
        // ------------------------------------

        // 4. --- 根据当前权限状态分别处理 ---
        if (currentPermission === "denied") { // 权限已被拒绝
            toastr.error('权限已被拒绝，请在浏览器设置中修改。');
            // 确保通知总开关是关闭状态
            if ($("#enableNotification").prop("checked")) {
                 Settings.saveSetting('enableNotification', false);
            }
            return; // 结束处理
        }

        if (currentPermission === "granted") { // 权限已授予
             toastr.info('已获得通知权限。');
             // 检查是否在通知间隔内
             if (!checkDebounce()) { // 如果间隔允许
                 // !! 关键修正：先更新时间戳 !!
                 lastNotificationTimestamp = Date.now();
                 console.log(`[${extensionName}] 更新 lastNotificationTimestamp (测试触发 - granted)`);

                 try { // 将发送/播放放入 try...catch
                     console.log(`[${extensionName}] 发送测试通知 (权限已授予)...`);
                     // 尝试创建并显示一个测试通知
                     new Notification("权限测试", { body: "通知权限正常！", icon: "/favicon.ico", silent: true, tag: 'st-perm-test' });
                     console.log(`[${extensionName}] 播放测试声音 (权限已授予)...`);
                     // 尝试播放通知声音
                     Audio.playNotification();
                     // (可选) 可以在这里添加一个 toastr 成功提示
                     // toastr.success("测试通知已发送！");
                 } catch(e){
                     // 如果发送通知或播放声音失败
                     console.error("测试通知/声音失败 (granted):", e);
                     // 给用户一个失败提示
                     toastr.error("发送测试通知或播放声音失败，请检查控制台。");
                     // 注意：即使失败，时间戳也已经被更新了，以强制执行间隔
                 }
             }
             // 确保通知总开关是开启状态 (即使测试通知被跳过也要确保)
             if (!$("#enableNotification").prop("checked")) {
                 Settings.saveSetting('enableNotification', true);
             }
             return; // 结束处理
        }

        // 如果权限状态是 'default' (需要请求)
        toastr.info('请求浏览器通知权限...');
        // 调用通知模块发起权限请求
        const granted = await Notifications.requestPermission();
        if (granted) { // 如果用户同意授权
            toastr.success('成功获得权限！');
             // 检查是否在通知间隔内
             if (!checkDebounce()) { // 如果间隔允许
                 // !! 关键修正：先更新时间戳 !!
                 lastNotificationTimestamp = Date.now();
                 console.log(`[${extensionName}] 更新 lastNotificationTimestamp (测试触发 - default granted)`);

                 try { // 将发送/播放放入 try...catch
                     console.log(`[${extensionName}] 发送测试通知 (权限刚授予)...`);
                     // 尝试创建并显示一个测试通知
                     new Notification("权限测试", { body: "通知权限正常！", icon: "/favicon.ico", silent: true, tag: 'st-perm-test' });
                     console.log(`[${extensionName}] 播放测试声音 (权限刚授予)...`);
                     // 尝试播放通知声音
                     Audio.playNotification();
                     // (可选) 可以在这里添加一个 toastr 成功提示
                     // toastr.success("权限已获取，测试通知已发送！");
                 } catch(e){
                     // 如果发送通知或播放声音失败
                     console.error("测试通知/声音失败 (default granted):", e);
                     toastr.error("发送测试通知或播放声音失败，请检查控制台。");
                     // 即使失败，时间戳也已经被更新
                 }
             }
            // 确保通知总开关是开启状态并保存
            Settings.saveSetting('enableNotification', true);
        } else { // 如果用户拒绝授权
            toastr.warning('未获得权限，通知功能无法使用。');
            // 确保通知总开关是关闭状态并保存
            Settings.saveSetting('enableNotification', false);
        }
        // UI 更新由 saveSetting -> updateUISettings 处理
    }
};


// --- 消息处理器对象 ---
// 负责监听 SillyTavern 的核心事件（如新消息），并触发相应的提醒
const MessageHandler = {
    /**
     * 判断当前是否需要发送提醒（页面是否非激活）
     * @returns {boolean}
     */
    shouldSendReminder() { return document.hidden || !document.hasFocus(); },

    /**
     * 处理 SillyTavern 发出的新消息事件
     * - 检查页面是否激活
     * - 检查通知间隔
     * - !! 更新全局通知时间戳 !!
     * - 根据平台和设置触发标题闪烁、系统通知、震动
     * @param {any} data - 事件数据 (未使用)
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
        // 只有通过间隔检查的真实消息提醒会更新此时间戳
        lastNotificationTimestamp = now;
        console.log(`[${extensionName}] 触发真实消息提醒流程... (更新时间戳)`);

        // 4. 获取平台信息
        const effectivePlatform = Platform.getEffectivePlatform();
        const isMobile = Platform.isMobilePlatform(effectivePlatform);

        // 5. 根据平台和设置触发提醒
        // a. 标题闪烁 (仅PC)
        if (!isMobile && Settings.getSetting('enableReminder')) {
            TitleFlash.startFlashing(); // startFlashing 内部会再次检查页面激活状态
        }
        // b. 系统通知 (所有平台)
        if (Settings.getSetting('enableNotification')) {
            await Notifications.sendNotification(); // sendNotification 内部处理声音和平台差异
        }
        // c. 震动 (仅移动端)
        if (isMobile && Settings.getSetting('enableVibration')) {
            MobileFeatures.triggerVibration(); // triggerVibration 内部检查 API 支持
        }
    }
};

// --- 启动初始化 ---
// 使用 jQuery 的 $(document).ready() 的简写形式
jQuery(() => {
    // 设置一个短暂的延迟，等待 SillyTavern 核心初始化可能需要的时间
    const initDelay = 300; // 毫秒
    // 在延迟后调用 InitManager.init() 开始本扩展的初始化
    setTimeout(() => {
        InitManager.init();
    }, initDelay);
});