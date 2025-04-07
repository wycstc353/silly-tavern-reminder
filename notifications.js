// 文件名: notifications.js
// 职责: 处理浏览器桌面通知（权限检查、请求、发送），根据平台调整行为

// 导入设置模块以获取配置
import { getSetting } from './settings.js';
// 导入音频模块以播放声音
import { playNotification } from './audio.js';
// 导入平台模块以判断平台和获取设置
import * as Platform from './platform.js';

// 扩展名称，用于日志
const extensionName = "silly-tavern-reminder";

/**
 * 检查浏览器是否支持 Notification API
 * @returns {boolean} 如果支持返回 true，否则返回 false
 */
function checkSupport() {
    const supported = ("Notification" in window);
    if (!supported) {
        console.warn(`[${extensionName}] [Notifications] 浏览器不支持 Notification API`);
    }
    return supported;
}

/**
 * 检查当前的通知权限状态
 * @returns {NotificationPermission} 返回 'granted'（已授予）, 'denied'（已拒绝）, 或 'default'（默认/未请求）
 */
function checkPermission() {
    // 直接返回 Notification.permission，如果 API 不存在，checkSupport 会先处理
    const permission = Notification.permission;
    // console.log(`[${extensionName}] [Notifications] checkPermission: ${permission}`); // 这个日志可能会很频繁，暂时注释
    return permission;
}

/**
 * 异步请求通知权限
 * @returns {Promise<boolean>} 返回一个 Promise，解析为 true 如果获得权限，否则为 false
 */
async function requestPermission() {
    console.log(`[${extensionName}] [Notifications] requestPermission called.`);
    if (!checkSupport()) {
        console.warn(`[${extensionName}] [Notifications] 请求权限失败：浏览器不支持。`);
        return false;
    }
    try {
        // 调用浏览器 API 请求权限
        console.log(`[${extensionName}] [Notifications] 调用 Notification.requestPermission()...`);
        const permission = await Notification.requestPermission();
        console.log(`%c[${extensionName}] [Notifications] 通知权限请求结果: ${permission}`, permission === 'granted' ? 'color: lightgreen;' : 'color: orange;');
        // 如果结果是 'granted'，则返回 true
        return permission === "granted";
    } catch (error) {
        // 处理请求过程中可能发生的错误
        console.error(`[${extensionName}] [Notifications] 请求通知权限时发生错误:`, error);
        return false; // 出错则视为未获得权限
    }
}

/**
 * 发送桌面通知，根据平台和设置调整行为
 * @param {string} [title="SillyTavern 新消息"] - 通知的标题
 * @param {string} [body="您有新的消息"] - 通知的主体内容
 * @param {object} [options={}] - 传递给 Notification 构造函数的额外选项
 * @returns {Promise<Notification | null>} 返回创建的 Notification 对象，如果未发送则返回 null
 */
async function sendNotification(title = "SillyTavern 新消息", body = "您有新的消息", options = {}) {
    console.log(`[${extensionName}] [Notifications] sendNotification function started.`);
    let notificationInstance = null; // 用于存储创建的通知对象

    // --- 前置检查 ---
    const isEnabled = getSetting('enableNotification');
    const isSupported = checkSupport();
    const currentPermission = checkPermission();
    console.log(`[${extensionName}] [Notifications] 前置检查: 总开关=${isEnabled}, 浏览器支持=${isSupported}, 权限=${currentPermission}`);

    if (!isEnabled) {
        console.log(`[${extensionName}] [Notifications] 未发送通知：总开关未启用。`);
        return null;
    }
    if (!isSupported) {
        console.log(`[${extensionName}] [Notifications] 未发送通知：浏览器不支持。`);
        return null;
    }
    if (currentPermission !== "granted") {
        console.warn(`[${extensionName}] [Notifications] 未发送通知：权限不是 'granted' (当前: ${currentPermission})。`);
        return null;
    }
    // --- 前置检查通过 ---
    console.log(`[${extensionName}] [Notifications] 前置检查通过。`);

    // 获取当前生效的平台信息
    const effectivePlatform = Platform.getEffectivePlatform();
    const isMobile = Platform.isMobilePlatform(effectivePlatform);
    // 准备平台相关的通知选项
    let platformSpecificOptions = {
        silent: true,           // 尝试静音浏览器默认声音，依赖我们自己的声音播放
        icon: "/favicon.ico"    // 使用 SillyTavern 的图标
    };

    // --- 根据平台和设置决定通知参数 ---
    if (isMobile) { // 如果是移动平台
        const mobileBehavior = getSetting('mobileNotificationBehavior');
        console.log(`[${extensionName}] [Notifications] 发送移动端 (${effectivePlatform}) 通知，行为: ${mobileBehavior}`);
        if (mobileBehavior === 'replace') { // 如果选择替换旧通知
            platformSpecificOptions.tag = 'sillytavern-message'; // 设置 tag，相同 tag 的新通知会替换旧通知
            platformSpecificOptions.renotify = false;           // 通常设为 false，避免系统重复响铃/震动 (移动端支持可能不一)
        } else { // 如果选择堆叠 ('stack')
            platformSpecificOptions.tag = undefined; // 不设置 tag
        }
    } else { // 如果是 PC 平台
        console.log(`[${extensionName}] [Notifications] 发送 PC (${effectivePlatform}) 通知`);
        platformSpecificOptions.tag = 'sillytavern-message'; // PC 上通常使用 tag 替换
        platformSpecificOptions.renotify = false;
    }
    // -----------------------------------

    try {
        // 合并基础选项、平台特定选项和外部传入的选项
        const finalOptions = { body: body, ...platformSpecificOptions, ...options };
        console.log(`%c[${extensionName}] [Notifications] 准备创建 Notification: title="${title}", options=`, 'color: yellow;', finalOptions);

        // !! 创建 Notification 实例 !!
        notificationInstance = new Notification(title, finalOptions);
        console.log(`%c[${extensionName}] [Notifications] Notification 实例创建成功:`, 'color: lightgreen;', notificationInstance);

        // --- 通知创建成功后，播放我们自定义的声音 ---
        console.log(`[${extensionName}] [Notifications] 通知创建成功，尝试播放声音...`);
        // !! 注意：这里是异步调用，但 sendNotification 本身不需要等待声音播放完成 !!
        playNotification(); // 调用 audio.js 中的函数

    } catch (error) {
        // !! 处理创建 Notification 时可能发生的错误 !!
        console.error(`%c[${extensionName}] [Notifications] 创建 Notification 实例时发生错误:`, 'color: red;', error);
        // 检查权限状态是否仍然是 'granted'，也许在检查和创建之间发生了变化？
        const postErrorPermission = checkPermission();
        if (postErrorPermission !== 'granted') {
             console.warn(`[${extensionName}] [Notifications] 发送通知失败，并且权限状态已不再是 'granted' (当前: ${postErrorPermission})`);
        }
        // 返回 null 表示失败
        return null;
    }
    // 返回创建的通知对象 (如果创建失败则在 catch 中已返回 null)
    console.log(`[${extensionName}] [Notifications] sendNotification function finished successfully.`);
    return notificationInstance;
}

// 导出需要被外部模块使用的函数
export {
    checkSupport,        // 检查支持函数
    checkPermission,     // 检查权限函数
    requestPermission,   // 请求权限函数
    sendNotification     // 发送通知函数
};