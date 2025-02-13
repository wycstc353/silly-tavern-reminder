// 扩展的主脚本
// 以下是一些基本扩展功能的示例

// 你可能需要从 extensions.js 导入 extension_settings, getContext 和 loadExtensionSettings
import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";

// 你可能需要从主脚本导入一些其他函数
import { saveSettingsDebounced } from "../../../../script.js";

// 跟踪扩展的位置，名称应与仓库名称匹配
const extensionName = "silly-tavern-reminder";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;
const extensionSettings = extension_settings[extensionName];
const defaultSettings = {};

// 如果存在扩展设置，则加载它们，否则将其初始化为默认值
async function loadSettings() {
  // 如果设置不存在则创建它们
  extension_settings[extensionName] = extension_settings[extensionName] || {};
  if (Object.keys(extension_settings[extensionName]).length === 0) {
    Object.assign(extension_settings[extensionName], defaultSettings);
  }

  // 在 UI 中更新设置
  $("#example_setting").prop("checked", extension_settings[extensionName].example_setting).trigger("input");
}

// 当扩展设置在 UI 中更改时调用此函数
function onExampleInput(event) {
  const value = Boolean($(event.target).prop("checked"));
  extension_settings[extensionName].example_setting = value;
  saveSettingsDebounced();
}

// 当按钮被点击时调用此函数
function onButtonClick() {
  // 你可以在这里做任何你想做的事情
  // 让我们弹出一个带有选中设置的弹窗
  toastr.info(
    `复选框是 ${extension_settings[extensionName].example_setting ? "选中" : "未选中"}`,
    "因为你点击了按钮，所以弹出了一个弹窗！"
  );
}

// 当扩展加载时调用此函数
jQuery(async () => {
  // 这是从文件加载 HTML 的示例
  const settingsHtml = await $.get(`${extensionFolderPath}/example.html`);

  // 将 settingsHtml 附加到 extensions_settings
  // extension_settings 和 extensions_settings2 是设置菜单的左右列
  // 左侧应为处理系统功能的扩展，右侧应为视觉/UI 相关的扩展
  $("#extensions_settings2").append(settingsHtml);

  // 这些是监听事件的示例
  $("#my_button").on("click", onButtonClick);
  $("#example_setting").on("input", onExampleInput);



  // 启动时加载设置（如果有的话）
  loadSettings();
});

//监听事件
eventSource.on(event_types.MESSAGE_RECEIVED, handleIncomingMessage);

function handleIncomingMessage(data) {
  console.log("收到新消息:", data);  // 在控制台打印消息数据
}