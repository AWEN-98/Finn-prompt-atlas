# F·BASE Prompt Atlas

F·BASE 是一套本地优先的 AI 图片反推、提示词编译与原子词库系统。当前仓库先开放浏览器采集插件，方便在网页中采集图片、运行视觉反推，并把结果写入本机 F·BASE 词库。

当前插件版本：`0.29.14`

## 插件能力

- 从网页右键菜单、悬浮拾取器、剪贴板或本地文件采集图片。
- 将图片拆解为成像、光色、镜头构图、人物动作、造型材质和场景版式。
- 生成完整中文提示词、同风格变体、参考色卡与原子词条。
- 支持多任务队列、并发运行、任务隔离和结果恢复。
- 连接 OpenAI 兼容接口，支持视觉反推与图片生成。
- 将原图、提示词、拆解档案和收藏内容写入本机 F·BASE。

## 安装插件

### 从 Release 安装

1. 在仓库的 Releases 页面下载最新 ZIP。
2. 解压到一个固定文件夹。
3. 打开 `chrome://extensions` 或 `edge://extensions`。
4. 开启“开发者模式”。
5. 点击“加载已解压的扩展程序”。
6. 选择解压后的 `extension` 文件夹。

### 从源码安装

1. 克隆或下载本仓库。
2. 打开浏览器扩展管理页面并开启开发者模式。
3. 选择“加载已解压的扩展程序”。
4. 选择仓库中的 [`extension`](./extension) 文件夹。

扩展采用 Manifest V3，无需构建即可加载。

## 首次配置

打开 F·BASE 浮窗后，在“运行设置”中填写：

1. 支持图片输入的 OpenAI 兼容 API 地址。
2. API Key。
3. 视觉模型 ID。
4. 可选的生图 API 地址、Key 与模型 ID。

密钥保存在浏览器本机存储和本机共享档案中，仓库不包含任何用户密钥。

## 本地词库连接

插件默认连接 `http://127.0.0.1:3000`。完整的自动入库、历史记录、收藏同步和“打开词库”功能需要本机 F·BASE 服务。

插件也会检查：

- `http://127.0.0.1:43117`：网页图片采集桥。
- `http://localhost:41595`：可选的 Eagle 本地接口。

未启动本机词库服务时，插件仍可加载界面并进行部分采集与接口配置，依赖入库的功能会显示离线状态。

## 权限说明

插件请求以下浏览器权限：

- `activeTab`、`tabs`、`scripting`：读取当前页面并完成图片采集。
- `contextMenus`：提供“发送到 F·BASE”右键菜单。
- `clipboardRead`：从剪贴板读取图片。
- `storage`：保存本机设置、任务状态与接口档案引用。
- `nativeMessaging`：在已安装本机启动器时唤起 F·BASE 服务。
- `<all_urls>`：支持在用户访问的网页中显示采集入口并读取用户主动选择的图片。

## 目录

```text
extension/
├── manifest.json       浏览器扩展清单
├── background.js       后台服务与请求代理
├── content.js          网页采集入口
├── sidepanel.html      F·BASE 浮窗工作台
├── sidepanel.js        任务、反推、生成与入库流程
└── *.css / assets      视觉系统与图标资源
```

更完整的版本记录与使用细节见 [`extension/README.md`](./extension/README.md)。

## 开发检查

修改后至少执行：

```powershell
Get-ChildItem extension -Filter *.js | ForEach-Object { node --check $_.FullName }
```

随后在 Chrome 或 Edge 的扩展管理页面重新加载，并检查图片采集、任务队列、接口配置和本机入库流程。

## 许可

代码以 [MIT License](./LICENSE) 发布。
