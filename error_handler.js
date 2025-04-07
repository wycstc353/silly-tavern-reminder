// 文件名: error_handler.js
// 职责: 捕获全局 JavaScript 错误并触发错误提示音

// 注意：此模块依赖于 audio 模块的 playError 函数，
// 该函数将通过主脚本 index.js 在初始化时传入，以避免循环依赖。

// 扩展名称，用于日志
const extensionName = "silly-tavern-reminder";

// 用于存储从外部传入的播放错误声音的函数引用
let playErrorSoundFunc = () => {}; // 初始化为一个空函数

/**
 * 初始化全局错误处理器
 * - 接收依赖项（播放错误声音的函数）
 * - 添加全局错误事件监听器 ('unhandledrejection' 和 'error')
 * @param {object} dependencies - 包含依赖函数的对象
 * @param {function} dependencies.playError - 用于播放错误声音的函数 (来自 audio.js)
 */
function initErrorHandler({ playError }) {
    // 将传入的 playError 函数赋值给内部变量
    playErrorSoundFunc = playError;

    // 添加监听器捕获未处理的 Promise 拒绝错误
    window.addEventListener('unhandledrejection', (event) => {
        console.warn(`[${extensionName}] 捕获到未处理的 Promise 拒绝:`, event.reason);
        // 调用统一的错误处理函数
        handleError(event.reason || 'Unhandled Promise Rejection');
    });

    // 添加监听器捕获全局运行时错误 (同步错误等)
    window.addEventListener('error', (event) => {
        // 检查 event 对象是否包含 error 属性，通常表示这是一个脚本错误
        if (event.error) {
             console.warn(`[${extensionName}] 捕获到全局运行时错误:`, event.error);
             // 调用统一的错误处理函数
             handleError(event.error || event.message || 'Global Error');
        } else if (event.message && event.filename) { // 尝试捕获其他类型的脚本错误信息
             console.warn(`[${extensionName}] 捕获到脚本错误事件:`, event.message, `at ${event.filename}:${event.lineno}`);
             handleError(event.message);
        }
        // 忽略非脚本错误（如资源加载失败），因为它们通常不应触发错误提示音
    });
    console.log(`[${extensionName}] 全局错误处理器初始化完成`);
}

/**
 * 统一处理捕获到的错误
 * - 在控制台详细打印错误信息
 * - 调用播放错误提示音的函数
 * @param {Error | any} error - 捕获到的错误对象或错误信息
 */
function handleError(error) {
    // 尝试获取更具体的错误消息，如果失败则使用错误对象本身或通用文本
    const errorMessage = error?.message || String(error) || '未知错误';
    // 在控制台打印详细错误信息，包括原始错误对象（如果可用）
    console.error(`[${extensionName}] ErrorHandler 处理错误: "${errorMessage}"`, error);

    // 调用传入的播放错误提示音函数
    playErrorSoundFunc();

    // 注意：默认不发送视觉上的错误通知弹窗，因为可能过于频繁或干扰
}

// 导出初始化函数
export {
    initErrorHandler // 初始化错误处理器的函数
};