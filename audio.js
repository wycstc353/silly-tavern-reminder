// 文件名: audio.js
// 职责: 管理音频对象的创建、加载和播放

// 导入设置模块以获取声音设置
import { getSetting } from './settings.js';

// 扩展名称，用于日志
const extensionName = "silly-tavern-reminder";
// 默认声音文件的相对路径 (相对于 public 目录)
const defaultNotificationSoundPath = '/sounds/notification.mp3'; // 确保此文件存在
const defaultErrorSoundPath = '/sounds/error.mp3';           // 确保此文件存在

// Audio 对象实例
let notificationSound = null; // 通知音
let errorSound = null;      // 错误音

/**
 * 初始化音频管理器
 * - 创建 Audio 对象
 * - 设置初始音量
 * - 加载默认或用户自定义的声音源
 */
function initAudio() {
    // 创建 Audio 对象
    notificationSound = new Audio();
    errorSound = new Audio();
    // 设置默认音量 (0.0 到 1.0 之间)
    notificationSound.volume = 0.5;
    errorSound.volume = 0.5;

    // 根据当前设置加载初始声音源
    updateNotificationSound(getSetting('notificationSoundDataUrl'));
    updateErrorSound(getSetting('errorSoundDataUrl'));
    console.log(`[${extensionName}] AudioManager 初始化完成`);
}

/**
 * 更新通知音的音频源 (src)
 * @param {string | null} dataUrl - 用户自定义声音的 Data URL，如果为 null 则使用默认路径
 */
function updateNotificationSound(dataUrl) {
    // 如果 Audio 对象未初始化，则退出
    if (!notificationSound) return;
    try {
        // 决定新的源路径：优先使用 dataUrl，否则使用默认路径
        const newSrc = dataUrl || defaultNotificationSoundPath;
        // 获取当前完整的 src (浏览器可能会自动添加 origin)
        const currentFullSrc = notificationSound.src;
        // 构造潜在的完整新 src (Data URL 不需要 origin，文件路径需要)
        const potentialNewFullSrc = newSrc.startsWith('data:') ? newSrc : (location.origin + newSrc);

        // 仅当源确实发生变化时才更新 src，避免不必要的重新加载
        if (currentFullSrc !== potentialNewFullSrc) {
             notificationSound.src = newSrc; // 设置新的音频源
             console.log(`[${extensionName}] 通知音源更新为 ${dataUrl ? '自定义' : '默认'}`);
        }
    } catch (err) {
        // 处理设置 src 可能发生的错误
        console.error(`[${extensionName}] 设置通知音源时出错:`, err);
        try {
            // 尝试回退到默认声音源
            notificationSound.src = defaultNotificationSoundPath;
        } catch (fallbackErr) {
            // 如果连回退都失败，记录更严重的错误
            console.error(`[${extensionName}] 回退到默认通知音源时也出错:`, fallbackErr);
        }
    }
}

/**
 * 更新错误提示音的音频源 (src)
 * @param {string | null} dataUrl - 用户自定义声音的 Data URL，如果为 null 则使用默认路径
 */
function updateErrorSound(dataUrl) {
     // 如果 Audio 对象未初始化，则退出
     if (!errorSound) return;
    try {
        // 决定新的源路径
        const newSrc = dataUrl || defaultErrorSoundPath;
        // 获取当前完整的 src
        const currentFullSrc = errorSound.src;
        // 构造潜在的完整新 src
        const potentialNewFullSrc = newSrc.startsWith('data:') ? newSrc : (location.origin + newSrc);

         // 仅当源确实发生变化时才更新 src
         if (currentFullSrc !== potentialNewFullSrc) {
            errorSound.src = newSrc; // 设置新的音频源
            console.log(`[${extensionName}] 错误音源更新为 ${dataUrl ? '自定义' : '默认'}`);
        }
    } catch (err) {
        // 处理设置 src 可能发生的错误
        console.error(`[${extensionName}] 设置错误音源时出错:`, err);
         try {
            // 尝试回退到默认声音源
            errorSound.src = defaultErrorSoundPath;
        } catch (fallbackErr) {
             console.error(`[${extensionName}] 回退到默认错误音源时也出错:`, fallbackErr);
        }
    }
}

/**
 * 播放通知音
 * - 检查通知功能是否启用
 * - 检查 Audio 对象和源是否有效
 * - 从头开始播放声音
 */
function playNotification() {
    // 检查设置总开关、Audio 对象是否存在、是否有有效的 src
    if (getSetting('enableNotification') && notificationSound && notificationSound.src) {
        notificationSound.currentTime = 0; // 将播放位置重置到开头
        // 调用 play() 方法，并捕获可能发生的错误 (例如用户未与页面交互)
        notificationSound.play().catch(err => console.error(`[${extensionName}] 播放通知音失败:`, err));
    }
}

/**
 * 播放错误提示音
 * - 检查错误提示音功能是否启用
 * - 检查 Audio 对象和源是否有效
 * - 从头开始播放声音
 */
function playError() {
    // 检查设置开关、Audio 对象和 src
    if (getSetting('enableErrorSound') && errorSound && errorSound.src) {
        errorSound.currentTime = 0; // 重置播放位置
        // 调用 play() 并捕获错误
        errorSound.play().catch(err => console.error(`[${extensionName}] 播放错误提示音失败:`, err));
    }
}

// 导出需要被外部模块使用的函数
export {
    initAudio,               // 初始化函数
    updateNotificationSound, // 更新通知音源函数
    updateErrorSound,        // 更新错误音源函数
    playNotification,        // 播放通知音函数
    playError                // 播放错误音函数
};