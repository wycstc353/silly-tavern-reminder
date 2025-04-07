// 文件名: title_flash.js
// 职责: 管理浏览器标签页标题的闪烁 (仅限 PC 平台)

// 导入设置模块以检查开关状态
import { getSetting } from './settings.js';
// 导入平台模块以检查当前平台
import * as Platform from './platform.js';

// 扩展名称，用于日志
const extensionName = "silly-tavern-reminder";
// 定时器变量
let timer = null;            // 存储 setInterval 返回的 ID
// 页面原始标题
let originalTitle = "";      // 用于在停止闪烁时恢复
// 闪烁状态标记
let isFlashing = false;      // 标记当前是否正在闪烁
// 闪烁时显示的文字
const newMessageTitle = "【新消息】"; // 可以自定义
// 闪烁的时间间隔 (毫秒)
const flashInterval = 1000;

/**
 * 开始闪烁标题 (仅在 PC 平台且满足条件时生效)
 * 条件：
 * 1. 当前平台为 PC
 * 2. 设置中启用了标题提醒
 * 3. 当前未在闪烁
 * 4. 页面处于隐藏状态 或 窗口失去焦点
 */
function startFlashing() {
    // 获取当前生效的平台
    const effectivePlatform = Platform.getEffectivePlatform();
    // 检查所有条件
    if (!Platform.isMobilePlatform(effectivePlatform) && // 条件1: 非移动平台
        getSetting('enableReminder') &&                  // 条件2: 启用提醒
        !isFlashing &&                                   // 条件3: 未在闪烁
        (document.hidden || !document.hasFocus())) {     // 条件4: 页面非激活

        // 如果原始标题尚未保存 (第一次闪烁或停止后)，保存当前标题
        if (!originalTitle) {
            originalTitle = document.title;
        }
        isFlashing = true; // 标记为正在闪烁
        // 立即改变一次标题，以便用户能立刻看到提示
        document.title = newMessageTitle;

        // 设置定时器，周期性地切换标题
        timer = setInterval(() => {
             // 安全检查，以防 originalTitle 未被正确设置
             if (!originalTitle) originalTitle = 'SillyTavern'; // 提供一个备用标题
             // 在 newMessageTitle 和 originalTitle 之间切换
             document.title = (document.title === newMessageTitle) ? originalTitle : newMessageTitle;
        }, flashInterval);
        console.log(`[${extensionName}] 开始标题闪烁 (PC)`);
    } else if (isFlashing && Platform.isMobilePlatform(effectivePlatform)) {
        // 异常情况处理：如果由于某些原因（如手动切换平台模式）导致在移动端开始了闪烁，则立即停止它
        stopFlashing();
    }
}

/**
 * 停止闪烁标题
 * - 清除定时器
 * - 恢复原始标题
 * - 重置状态
 */
function stopFlashing() {
    // 如果定时器存在，清除它
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
    // 只有在确实处于闪烁状态时才恢复标题
    if (isFlashing) {
        // 如果原始标题存在，恢复它
        if (originalTitle) {
            document.title = originalTitle;
        } else {
            // 如果原始标题丢失，恢复一个通用标题
            document.title = 'SillyTavern';
            console.warn(`[${extensionName}] 停止标题闪烁，但原始标题丢失，已恢复为默认。`);
        }
    }
    // 重置 originalTitle，以便下次 start 时能获取最新的标题
    originalTitle = "";
    // 重置闪烁状态标记
    isFlashing = false;
    // console.log(`[${extensionName}] 停止标题闪烁`); // 取消注释以查看停止日志
}

/**
 * 初始化标题闪烁管理器
 * - 添加事件监听器，用于在页面变为可见或获得焦点时自动停止闪烁
 */
function initTitleFlash() {
    // 监听 'visibilitychange' 事件 (切换标签页)
    document.addEventListener('visibilitychange', () => {
        // 如果页面变为可见 (document.hidden 为 false) 并且当前正在闪烁
        if (!document.hidden && isFlashing) {
            stopFlashing(); // 停止闪烁
        }
    });
    // 监听 'focus' 事件 (窗口获得焦点)
    window.addEventListener('focus', () => {
        // 如果窗口获得焦点并且当前正在闪烁
        if (isFlashing) {
            stopFlashing(); // 停止闪烁
        }
    });
     console.log(`[${extensionName}] TitleFlashManager 事件监听器初始化完成`);
}

// 导出需要被外部模块使用的函数和状态
export {
    initTitleFlash,  // 初始化函数
    startFlashing,   // 开始闪烁函数
    stopFlashing,    // 停止闪烁函数
    isFlashing       // 当前是否在闪烁的状态 (可选导出)
};