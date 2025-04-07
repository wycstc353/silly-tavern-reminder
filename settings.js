// 文件名: settings.js
// 职责: 管理扩展的所有设置（加载、保存、默认值、UI更新）

// 导入 SillyTavern 核心功能
import { extension_settings } from "../../../extensions.js"; // 扩展设置对象
import { saveSettingsDebounced } from "../../../../script.js"; // 防抖保存函数
// 导入平台模块以进行平台判断
import * as Platform from './platform.js';

/**
 * 定义平台选项类型
 * @typedef {'auto' | 'pc' | 'android' | 'ios'} PlatformOption
 */
/**
 * 定义移动端通知行为选项类型
 * @typedef {'replace' | 'stack'} MobileNotificationBehaviorOption
 */

// 扩展的默认设置
const defaultSettings = {
    // --- 通用设置 ---
    enableReminder: true,               // 布尔值: 标题闪烁总开关 (逻辑上仅PC有效)
    enableNotification: true,           // 布尔值: 系统通知总开关
    enableErrorSound: true,             // 布尔值: 错误提示音总开关
    notificationSoundDataUrl: null,     // 字符串或null: 自定义通知声音 Data URL
    errorSoundDataUrl: null,          // 字符串或null: 自定义错误声音 Data URL
    notificationSoundFilename: '',      // 字符串: 通知声音文件名 (UI显示)
    errorSoundFilename: '',             // 字符串: 错误声音文件名 (UI显示)
    notificationDebounceSeconds: 5,     // 数字: 通知去重间隔（秒），0表示禁用
    /** @type {PlatformOption} */
    platformOverride: 'auto',           // 字符串: 平台覆盖选项 ('auto', 'pc', 'android', 'ios')
    // --- 移动端专属设置 ---
    /** @type {MobileNotificationBehaviorOption} */
    mobileNotificationBehavior: 'replace', // 字符串: 移动端通知行为 ('replace', 'stack')
    enableVibration: true               // 布尔值: 是否启用移动端震动
};

// 存储当前加载的设置对象
let settings = {};
// 扩展名称，用于日志等
const extensionName = "silly-tavern-reminder";

/**
 * 加载扩展设置
 * - 确保设置对象存在
 * - 合并默认值到缺失的设置项
 * - 如果补充了默认值，则保存一次
 * @param {string} currentExtensionName - 当前扩展的名称
 */
function loadSettings(currentExtensionName) {
    // 确保在全局 settings 对象中有该扩展的条目
    extension_settings[currentExtensionName] = extension_settings[currentExtensionName] || {};
    // 将 settings 变量指向该扩展的设置对象引用
    settings = extension_settings[currentExtensionName];
    let settingsChanged = false; // 标记设置是否被修改（用于判断是否需要保存）

    // 遍历默认设置的键
    for (const key in defaultSettings) {
        // 如果当前设置中不存在该键（即值为 undefined）
        if (settings[key] === undefined) {
            // 使用默认值填充
            settings[key] = defaultSettings[key];
            settingsChanged = true; // 标记已修改
        }
    }
    // 如果在加载过程中补充了任何默认值
    if (settingsChanged) {
         console.log(`[${extensionName}] 首次加载或补充默认设置，进行保存。`);
         saveSettingsDebounced(); // 调用防抖保存函数
    }

    console.log(`[${extensionName}] 设置加载完成。`);
    // 注意：初始的 UI 更新将在 index.js 的初始化流程中，在界面加载后调用
}

/**
 * 更新前端设置界面的显示状态和可见性
 * - 根据当前设置更新各控件的值
 * - 根据当前生效的平台显示/隐藏移动端专属设置区域
 * - 根据平台和相关开关状态更新控件的禁用状态
 */
function updateUISettings() {
    // 如果设置对象尚未初始化，则退出
    if (!settings) return;

    // 获取当前生效的平台信息
    const effectivePlatform = Platform.getEffectivePlatform();
    const isMobile = Platform.isMobilePlatform(effectivePlatform);
    const detectedPlatform = Platform.detectedPlatform;
    const selectedPlatformOverride = settings.platformOverride;

    // --- 更新通用设置控件的值 ---
    $("#platformOverride").val(selectedPlatformOverride); // 更新下拉框选中项
    $("#enableReminder").prop("checked", settings.enableReminder); // 更新标题提醒复选框

    // --- 更新自动检测平台显示 ---
    const detectedPlatformDisplay = $("#detected_platform_display"); // 获取显示区域元素
    // 如果用户选择了“自动检测”且已成功检测到平台
    if (selectedPlatformOverride === 'auto' && detectedPlatform !== 'unknown') {
         // 将检测到的平台名称转换为用户友好的文本
         let platformText = detectedPlatform.charAt(0).toUpperCase() + detectedPlatform.slice(1); // 首字母大写
         // 在元素中显示文本并确保元素可见
         detectedPlatformDisplay.text(`(检测到: ${platformText})`).show();
    } else {
         // 否则（用户强制选择或未检测到），清空文本并隐藏元素
         detectedPlatformDisplay.text("").hide();
    }

    // --- 更新系统通知 & 声音设置 ---
    $("#enableNotification").prop("checked", settings.enableNotification); // 更新通知总开关复选框
    $("#notificationDebounceSeconds").val(settings.notificationDebounceSeconds); // 更新通知间隔输入框
    // 更新通知声音文件名显示，如果为空则显示“默认”，并设置 title 属性显示完整名
    $("#notification_sound_filename").text(settings.notificationSoundFilename || '默认').attr('title', settings.notificationSoundFilename || '默认');

    // --- 更新错误提示设置 ---
    $("#enableErrorSound").prop("checked", settings.enableErrorSound); // 更新错误提示音开关复选框
    // 更新错误声音文件名显示
    $("#error_sound_filename").text(settings.errorSoundFilename || '默认').attr('title', settings.errorSoundFilename || '默认');

    // --- 根据平台显示/隐藏移动端专属设置区域 ---
    if (isMobile) { // 如果是移动平台
        $("#mobile_specific_settings").show(); // 显示移动设置区域
        // 更新移动端设置控件的值
        $("#mobileNotificationBehavior").val(settings.mobileNotificationBehavior);
        $("#enableVibration").prop("checked", settings.enableVibration);
    } else { // 如果不是移动平台
        $("#mobile_specific_settings").hide(); // 隐藏移动设置区域
    }

    // --- 更新控件的禁用/启用状态 ---
    // 权限申请按钮始终启用（除非浏览器不支持，在点击时处理）

    // 标题提醒复选框仅在 PC 端启用
    $("#enableReminder").prop("disabled", isMobile);

    // 以下控件受“启用新消息系统提醒”(#enableNotification)开关的影响
    const notificationControlsDisabled = !settings.enableNotification;
    $("#notificationDebounceSeconds, #notification_sound_file, #clear_notification_sound").prop("disabled", notificationControlsDisabled);

    // 以下控件受“启用错误提示音”(#enableErrorSound)开关的影响
    const errorControlsDisabled = !settings.enableErrorSound;
    $("#error_sound_file, #clear_error_sound").prop("disabled", errorControlsDisabled);

    // 移动端控件受“启用新消息系统提醒”开关和是否为移动平台的影响
    const mobileControlsDisabled = notificationControlsDisabled || !isMobile;
    $("#mobileNotificationBehavior, #enableVibration").prop("disabled", mobileControlsDisabled);

    // 记录日志，包含当前的平台信息
    console.log(`[${extensionName}] UI 设置已更新 (生效平台: ${effectivePlatform}, 检测到: ${detectedPlatform}, 是否移动端: ${isMobile})`);
}


/**
 * 保存单个设置项
 * - 对特定类型的输入进行转换和验证 (如数字、布尔值)
 * - 将值存入 settings 对象
 * - 调用防抖保存函数
 * - 打印保存日志
 * - 调用 updateUISettings 更新界面
 * @param {string} key - 设置项的键名 (应与 defaultSettings 中的键一致)
 * @param {any} value - 从 UI 控件获取的新值
 */
function saveSetting(key, value) {
    // 确保 settings 对象存在
    if (settings) {
        // 对特定键进行类型处理
        if (key === 'notificationDebounceSeconds') { // 如果是通知间隔
            value = parseInt(value, 10); // 转换为整数
            if (isNaN(value) || value < 0) value = 0; // 无效或负数则设为 0
            $("#notificationDebounceSeconds").val(value); // 确保 UI 输入框显示处理后的值
        } else if (key === 'enableReminder' || key === 'enableNotification' || key === 'enableErrorSound' || key === 'enableVibration') { // 如果是布尔开关
            value = Boolean(value); // 转换为布尔值
        }
        // 其他类型 (如 platformOverride, mobileNotificationBehavior, DataUrls, Filenames) 通常是字符串，直接使用

        // 更新 settings 对象中的值
        settings[key] = value;
        // 调用防抖保存函数
        saveSettingsDebounced();
        // 记录保存日志，对 DataURL 只打印占位符避免控制台刷屏
        console.log(`[${extensionName}] 保存设置 ${key} =`, (typeof value === 'string' && value.startsWith('data:')) ? '<DataURL>' : value);
        // 保存后立即更新 UI，确保状态和可见性一致
        updateUISettings();
    }
}

/**
 * 获取单个设置项的值
 * @param {string} key - 设置项的键名
 * @returns {any} 设置项的值，如果设置未加载则返回 undefined
 */
function getSetting(key) {
    return settings ? settings[key] : undefined;
}

/**
 * 获取所有设置项
 * @returns {object} 当前所有设置的对象，如果未加载则返回空对象
 */
function getAllSettings() {
    return settings || {};
}

// 导出需要被外部模块使用的函数和变量
export {
    loadSettings,       // 加载设置函数
    updateUISettings,   // 更新 UI 函数
    saveSetting,        // 保存单个设置函数
    getSetting,         // 获取单个设置函数
    getAllSettings,     // 获取所有设置函数
    defaultSettings     // 默认设置对象（可能用于参考）
};