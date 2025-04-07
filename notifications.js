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
    // 检查 window 对象中是否存在 Notification 构造函数
    if (!("Notification" in window)) {
        console.warn(`[${extensionName}] 此浏览器不支持桌面通知功能`);
        return false;
    }
    return true;
}

/**
 * 检查当前的通知权限状态
 * @returns {NotificationPermission} 返回 'granted'（已授予）, 'denied'（已拒绝）, 或 'default'（默认/未请求）
 */
function checkPermission() {
    // 如果浏览器支持 Notification API，则返回权限状态，否则视为不支持（虽然 checkSupport 会先检查）
    return Notification.permission || 'denied'; // 或返回 'default' 也可以
}

/**
 * 异步请求通知权限
 * @returns {Promise<boolean>} 返回一个 Promise，解析为 true 如果获得权限，否则为 false
 */
async function requestPermission() {
    // 如果浏览器不支持，直接返回 false
    if (!checkSupport()) return false;
    try {
        // 调用浏览器 API 请求权限
        const permission = await Notification.requestPermission();
        console.log(`[${extensionName}] 通知权限请求结果: ${permission}`);
        // 如果结果是 'granted'，则返回 true
        return permission === "granted";
    } catch (error) {
        // 处理请求过程中可能发生的错误
        console.error(`[${extensionName}] 请求通知权限时出错:`, error);
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
    let notificationInstance = null; // 用于存储创建的通知对象

    // 前置检查：总开关是否启用、浏览器是否支持、权限是否已授予
    if (!getSetting('enableNotification') || !checkSupport() || checkPermission() !== "granted") {
        // 如果任一条件不满足，则不发送通知，直接返回 null
        // (可选) 可以在这里加日志说明未发送的原因
        // console.log(`[${extensionName}] 未发送通知 (启用: ${getSetting('enableNotification')}, 支持: ${checkSupport()}, 权限: ${checkPermission()})`);
        return null;
    }

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
        // 获取移动端的通知行为设置 ('replace' 或 'stack')
        const mobileBehavior = getSetting('mobileNotificationBehavior');
        console.log(`[${extensionName}] 发送移动端 (${effectivePlatform}) 通知，行为: ${mobileBehavior}`);
        if (mobileBehavior === 'replace') { // 如果选择替换旧通知
            platformSpecificOptions.tag = 'sillytavern-message'; // 设置 tag，相同 tag 的新通知会替换旧通知
            platformSpecificOptions.renotify = false;           // 通常设为 false，避免系统重复响铃/震动
        } else { // 如果选择堆叠 ('stack')
            // 不设置 tag，允许通知堆叠
            platformSpecificOptions.tag = undefined;
            // 在没有 tag 时，renotify 通常无效果，保持默认或 false
        }
        // 注意：移动端对 `silent`, `renotify` 等参数的支持和行为可能不一致
    } else { // 如果是 PC 平台
        console.log(`[${extensionName}] 发送 PC (${effectivePlatform}) 通知`);
        platformSpecificOptions.tag = 'sillytavern-message'; // PC 上通常使用 tag 替换
        platformSpecificOptions.renotify = false;
    }
    // -----------------------------------

    try {
        // 合并基础选项、平台特定选项和外部传入的选项
        const finalOptions = { body: body, ...platformSpecificOptions, ...options };
        // 打印最终要创建通知的参数 (用于调试)
        console.log(`[${extensionName}] 创建 Notification: title="${title}", options=`, finalOptions);

        // 创建 Notification 实例
        notificationInstance = new Notification(title, finalOptions);

        // 通知创建成功后，播放我们自定义的声音
        playNotification();

    } catch (error) {
        // 处理创建 Notification 时可能发生的错误 (例如权限突然被撤销)
        console.error(`[${extensionName}] 发送通知时出错:`, error);
        // 检查权限状态是否仍然是 'granted'
        if (checkPermission() !== 'granted') {
             console.warn(`[${extensionName}] 发送通知失败，权限状态已变为: ${checkPermission()}`);
        }
    }
    // 返回创建的通知对象 (如果创建失败则为 null)
    return notificationInstance;
}

// 导出需要被外部模块使用的函数
export {
    checkSupport,        // 检查支持函数
    checkPermission,     // 检查权限函数
    requestPermission,   // 请求权限函数
    sendNotification     // 发送通知函数
};