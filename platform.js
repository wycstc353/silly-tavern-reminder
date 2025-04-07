// 文件名: platform.js
// 职责: 检测用户设备平台并处理用户的覆盖设置

// 导入设置模块以获取平台覆盖设置
import { getSetting } from './settings.js';

// 扩展名称，用于日志
const extensionName = "silly-tavern-reminder";

/**
 * 定义可能的平台检测结果类型
 * @typedef {'pc' | 'android' | 'ios' | 'unknown'} DetectedPlatform
 */
/**
 * 定义用户设置中的平台选项类型 (从 settings.js 导入也可)
 * @typedef {import('./settings.js').PlatformOption} PlatformOption
 */

// 存储自动检测到的平台结果 ('pc', 'android', 'ios', 'unknown')
let detectedPlatform = 'unknown';

/**
 * 尝试根据 User Agent 字符串检测平台
 * 注意：User Agent 检测并非 100% 可靠，但通常足够用
 * @returns {DetectedPlatform} 返回检测到的平台类型
 */
function detectPlatform() {
    // 获取 User Agent 字符串
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    // 常见的检测逻辑
    if (/windows phone/i.test(ua)) return 'pc'; // Windows Phone 可能行为更像 PC
    if (/android/i.test(ua)) return 'android'; // 检测 Android
    // 检测 iOS (来自 https://stackoverflow.com/a/9039885/177710)
    if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return 'ios';
    // 其他情况（包括 Windows, Mac, Linux 桌面）默认为 'pc'
    return 'pc';
}

/**
 * 初始化平台检测模块
 * - 调用 detectPlatform 获取结果
 * - 记录日志
 */
function initPlatform() {
    // 执行检测并将结果存储在 detectedPlatform 变量中
    detectedPlatform = detectPlatform();
    console.log(`[${extensionName}] 自动检测到的平台: ${detectedPlatform}`);
}

/**
 * 获取当前生效的平台模式
 * - 首先检查用户是否在设置中强制指定了平台
 * - 如果没有强制指定（或设为 'auto'），则返回自动检测的结果
 * @returns {DetectedPlatform | 'auto'} 返回最终生效的平台类型 ('pc', 'android', 'ios', 'unknown', 或者如果设置是 'auto' 但未检测到，理论上也可能返回 'auto'，但通常是 'unknown')
 */
function getEffectivePlatform() {
    // 从设置中获取用户的覆盖选项
    const override = getSetting('platformOverride');
    // 如果用户设置了覆盖选项，并且不是 'auto'
    if (override && override !== 'auto') {
        // 返回用户强制指定的平台
        return override;
    }
    // 否则（用户选择 'auto' 或设置无效），返回自动检测的结果
    return detectedPlatform;
}

/**
 * 检查指定平台或当前生效平台是否为移动平台 (Android 或 iOS)
 * @param {DetectedPlatform | PlatformOption} [platformToCheck] - 可选参数，要检查的平台字符串。如果未提供，则使用 getEffectivePlatform() 获取当前生效的平台。
 * @returns {boolean} 如果是 Android 或 iOS，返回 true，否则返回 false。
 */
function isMobilePlatform(platformToCheck) {
    // 如果没有传入要检查的平台，则获取当前生效的平台
    const platform = platformToCheck || getEffectivePlatform();
    // 判断平台是否为 'android' 或 'ios'
    return platform === 'android' || platform === 'ios';
}

// 导出需要被外部模块使用的函数和变量
export {
    initPlatform,         // 初始化函数
    getEffectivePlatform, // 获取生效平台函数
    isMobilePlatform,     // 判断是否移动平台函数
    detectedPlatform      // 自动检测结果 (可选导出，主要用于 UI 显示)
};