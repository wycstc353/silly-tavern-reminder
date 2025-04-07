// 文件名: mobile_features.js
// 职责: 处理移动端特有的功能，主要是震动

// 导入设置模块以检查震动开关状态
import { getSetting } from './settings.js';
// 导入平台模块以判断当前是否为移动平台
import { isMobilePlatform } from './platform.js';

// 扩展名称，用于日志
const extensionName = "silly-tavern-reminder";

/**
 * 触发设备震动（如果满足所有条件）
 * 条件：
 * 1. 设置中启用了震动功能
 * 2. 当前生效平台是移动平台 (Android/iOS)
 * 3. 浏览器支持 Vibration API (`navigator.vibrate`)
 * @param {number | number[]} [pattern=200] - 震动模式。可以是单次震动的毫秒数（默认200ms），或一个描述震动/暂停交替模式的数组 (例如 [100, 50, 100])。
 */
function triggerVibration(pattern = 200) {
    // 检查所有条件
    if (!getSetting('enableVibration') || // 条件1: 设置开关
        !isMobilePlatform() ||          // 条件2: 平台判断 (isMobilePlatform 内部会调用 getEffectivePlatform)
        !('vibrate' in navigator)) {    // 条件3: 浏览器 API 支持
        // (可选) 如果条件2或3不满足但开关是开的，可以加日志提示用户
        // if (getSetting('enableVibration') && isMobilePlatform() && !('vibrate' in navigator)) {
        //     console.log(`[${extensionName}] 震动已启用且为移动平台，但浏览器不支持震动 API (navigator.vibrate)`);
        // }
        return; // 不满足条件，直接退出
    }

    try {
        // 调用浏览器的 vibrate API
        navigator.vibrate(pattern);
        // console.log(`[${extensionName}] 触发震动:`, pattern); // 取消注释以查看震动日志
    } catch (err) {
        // 理论上 vibrate 不应抛出错误，但以防万一添加捕获
        console.error(`[${extensionName}] 尝试调用 navigator.vibrate 时出错:`, err);
    }
}

// 导出需要被外部模块使用的函数
export {
    triggerVibration // 触发震动函数
};