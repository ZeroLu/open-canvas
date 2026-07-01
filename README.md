# Open Canvas

[中文](#中文说明) | [English](#english)

<img width="2586" height="1290" alt="image" src="https://github.com/user-attachments/assets/aa3b0b86-18ea-436e-8541-224571f2f680" />
<img width="2340" height="1398" alt="image" src="https://github.com/user-attachments/assets/96697e17-55cc-444b-8cba-708bd2c9a633" />

## 中文说明

`Open Canvas` 是一个 local-first 的工作流画布项目，从 Cyberbara 内部 canvas 的产品方向中抽离出来。

状态：`alpha`

目标很直接：

- 保持画布本身开源、容易 fork
- 允许用户自带 API Key
- 让整套工作流可以在本地机器上直接运行，不依赖 Cyberbara 登录、credits 或数据库初始化

## 这个 alpha 版本目前已经支持

- 画布列表页和 studio 页面，studio 现在运行的是从主应用抽离出来的真实 `CanvasStudioShell`
- 共享 canvas 图模型中的 note、text、image、video 和 audio 节点类型
- 通过本地 BYOK 设置表单支持 `Cyberbara`、`OpenRouter` 和 `Replicate`
- 基于磁盘 JSON 文件的多画布本地持久化
- JSON 导出和导入
- 自动把上游节点输出注入下游执行
- 支持通过 Cyberbara 或自定义存储上传 image/video 节点资源

## Provider 模型

这个 starter 有意保持 provider 层足够简单。

- `Text` 节点可以调用 `Cyberbara` 或 `OpenRouter`
- `Image` 和 `Video` 节点可以调用 `Cyberbara` 或 `Replicate`
- 上传可以使用 `Cyberbara` 存储或 `S3-compatible` 存储

`Cyberbara` 是新建 text、image 和 video 节点时的默认 provider。媒体生成和上传走公开文档里的 `cyberbara.com/api/v1` API。文本节点使用的是 Cyberbara 主 canvas 栈当前使用的 Gemini 3 Flash chat endpoint。

如果某个 Cyberbara key 只具备媒体权限，调用 Gemini endpoint 时被拒绝，请在节点编辑器里把 text 节点切到 `OpenRouter`。

如果你使用 Cyberbara 做媒体生成，一把 API key 就足够覆盖图片生成、视频生成和上传。

## 存储抽象

这个仓库包含一个存储 provider 接口，以及两条上传路径：

- `Cyberbara` 上传，复用同一个 Cyberbara API key
- `S3-compatible` 上传，用于自托管或第三方对象存储

- 存储协议定义在 `lib/storage/index.ts`
- provider 初始化在 `lib/storage/manager.ts`
- 第一个适配器是 `lib/storage/s3-compatible.ts`
- 上传请求解析和校验在 `lib/uploads.ts`
- 上传路由在 `app/api/uploads/images/route.ts` 和 `app/api/uploads/videos/route.ts`

### 支持的配置

你可以在应用内的 provider 设置表单里保存存储配置，也可以用环境变量设置服务端默认值：

```bash
STORAGE_PROVIDER=s3-compatible
STORAGE_S3_ENDPOINT=https://your-s3-endpoint.example.com
STORAGE_S3_REGION=auto
STORAGE_S3_ACCESS_KEY_ID=...
STORAGE_S3_SECRET_ACCESS_KEY=...
STORAGE_S3_BUCKET=open-canvas
STORAGE_S3_PUBLIC_DOMAIN=https://cdn.example.com
STORAGE_S3_PATH_PREFIX=uploads
```

这套配置适用于任意 S3-compatible 后端，包括自托管对象存储。

## 本地持久化

这个应用是 local-first，但当前持久化模型已经更接近主产品 shell。

- 画布和运行记录存储在 `data/open-canvas-db.json`
- provider 设置通过应用内 `Providers` 表单保存，并同步到一个本地 cookie 供服务端路由读取
- 根路由 `/` 和 `/canvas` 都会打开本地画布列表页
- 每次导入 JSON 文件都会创建一个全新的本地画布，而不是覆盖已有画布

你可以在列表页或 studio 内的 `Canvases` 对话框中创建、重命名、删除和打开多个画布。导出功能在 studio 页面里。导入功能在列表页和 studio 页面里都可用。

## 本地运行

```bash
pnpm install
pnpm dev
```

打开 `http://localhost:3000`。

首屏是画布列表页。你可以从这里新建画布，或者导入已有的 JSON 导出文件。

进入某个画布后，打开 `Providers` 按钮，按需保存以下配置：

- `Cyberbara API Key`：用于 Cyberbara 的文本、图片、视频和上传流程
- `OpenRouter API Key`：如果你想让 text 节点改走 OpenRouter
- `Replicate API Token`：如果你想让 image 或 video 节点改走 Replicate
- 可选的 `S3-compatible` 存储配置：如果你想把上传资源写入自己的对象存储

表单在保存前会校验 provider 配置：

- 非法 URL 会被拒绝
- 启用 Cyberbara 上传时，`Cyberbara API Key` 必填
- 启用 S3 存储时，endpoint、access key、secret key 和 bucket 必填
- 保存后的值还会写入本地 cookie，供服务端执行路由读取

如果你不启用存储，上传按钮会保持不可用，因为没有任何存储 provider 能接收文件。

## 模型预期

这个仓库目前还没有内置 provider model catalog。每个节点的 model 字符串需要你自己填写。

示例：

- text 节点：任意兼容 OpenRouter 的 chat model
- image 节点：Cyberbara 的 model slug，例如 `nano-banana-pro`，或者 Replicate 的 model slug
- video 节点：Cyberbara 的 model slug，例如 `seedance-1-lite`，或者 Replicate 的 model slug

对于 Replicate 节点，advanced JSON 输入框里的内容会合并进请求 `input`。

对于 Cyberbara 的 image/video 节点，advanced JSON 输入框里的内容会成为请求里的 `options` 对象。应用还会自动推断 `scene`：

- `text-to-image` / `image-to-image`
- `text-to-video` / `image-to-video` / `video-to-video`

Canvas 会套用以下规则：

- 如果 `input.prompt` 缺失，会自动用节点 prompt 补上
- 如果存在上游媒体节点，并且你没有手动设置图片字段，它会把该媒体 URL 注入一个通用图片输入字段
- 如果某个 Cyberbara 媒体节点存在上游媒体，并且你没有手动设置 `image_input` 或 `video_input`，它会自动注入这些值

## 当前版本的已知限制

- 没有 auth 或多用户同步
- 没有带鉴权或多租户的托管存储工作流
- 没有模板库
- 没有分享链接
- 没有执行队列
- 还没有基于模型 schema 动态生成 provider 表单
- 还没有 model catalog
- Cyberbara text 目前仍依赖主产品栈使用的 Gemini 3 Flash endpoint，而不是公开媒体 API

## 拆分路线图

### Phase 1

- local-first 独立应用
- BYOK provider 执行
- JSON 导入导出

### Phase 2

- 把 Cyberbara 当前纯画布图逻辑抽成共享 package
- 将节点 schema 和执行描述符移动到 `packages/canvas-core`
- 将 provider adapters 拆成独立 package

### Phase 3

- 社区维护的模型注册表
- provider 专属设置面板
- 可插拔持久化层，例如 IndexedDB、SQLite、Supabase 或文件模式

## 为什么这样设计

生产环境里的 Cyberbara canvas 强依赖 auth、云端持久化、审核、credit 计费和任务编排。

这个仓库采取了另一种取向：

- 在可行范围内保留真实的 studio shell 体验
- 用本地 JSON 存储替代托管持久化
- 保持 provider adapter 可替换
- 默认让用户的密钥只留在本地

## 发布前

在发布这个仓库之前，请先阅读 [RELEASING.md](./RELEASING.md)。

简版清单：

- 确认你有权发布这个仓库里的每一个文件
- 选好公开仓库名称和描述
- 在 README 中补全 provider 示例
- 使用你自己的 OpenRouter、Cyberbara、Replicate 和存储凭据完整跑一遍流程

贡献指南见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## English

`Open Canvas` is a local-first workflow canvas extracted from the direction of Cyberbara's internal canvas.

Status: `alpha`

The goal is straightforward:

- keep the canvas itself open and easy to fork
- let users bring their own API keys
- make the workflow runnable on a local machine without Cyberbara auth, credits, or database setup

## What this alpha already does

- a canvas list page plus a studio page that now runs the real `CanvasStudioShell` extracted from the main app
- note, text, image, video, and audio node types in the shared canvas graph model
- `Cyberbara`, `OpenRouter`, and `Replicate` provider support through a local BYOK settings form
- multiple local canvases backed by a JSON file on disk
- export and import as JSON
- upstream node output injected into downstream execution
- Cyberbara or storage-backed image and video uploads for canvas nodes

## Provider model

This starter keeps the provider layer intentionally simple.

- `Text` nodes can call `Cyberbara` or `OpenRouter`
- `Image` and `Video` nodes can call `Cyberbara` or `Replicate`
- uploads can use `Cyberbara` storage or `S3-compatible` storage

`Cyberbara` is the default provider for new text, image, and video nodes. Media generation and uploads use the documented `cyberbara.com/api/v1` API. Text uses the Gemini 3 Flash chat endpoint used by the main Cyberbara canvas stack.

If a specific Cyberbara key is scoped for media only and is rejected by the Gemini endpoint, switch text nodes to `OpenRouter` in the node editor.

If you choose Cyberbara for media work, one API key is enough for image generation, video generation, and uploads.

## Storage abstraction

This repo includes a storage provider interface and two upload paths:

- `Cyberbara` uploads, which reuse the same Cyberbara API key
- `S3-compatible` uploads for self-hosted or third-party object storage

- storage contracts live in `lib/storage/index.ts`
- provider bootstrapping lives in `lib/storage/manager.ts`
- the first adapter is `lib/storage/s3-compatible.ts`
- upload request parsing and validation live in `lib/uploads.ts`
- upload routes live in `app/api/uploads/images/route.ts` and `app/api/uploads/videos/route.ts`

### Supported configuration

You can save storage values in the in-app provider settings form, or set server-side defaults as environment variables:

```bash
STORAGE_PROVIDER=s3-compatible
STORAGE_S3_ENDPOINT=https://your-s3-endpoint.example.com
STORAGE_S3_REGION=auto
STORAGE_S3_ACCESS_KEY_ID=...
STORAGE_S3_SECRET_ACCESS_KEY=...
STORAGE_S3_BUCKET=open-canvas
STORAGE_S3_PUBLIC_DOMAIN=https://cdn.example.com
STORAGE_S3_PATH_PREFIX=uploads
```

This is designed to work with any S3-compatible backend, including self-hosted object storage.

## Local persistence

The app is local-first, but the persistence model is now closer to the main product shell.

- canvases and run records are stored in `data/open-canvas-db.json`
- provider settings are saved through the in-app `Providers` form and mirrored into a local cookie for server routes
- the root route `/` and `/canvas` both open the local canvas list page
- each imported JSON file creates a brand new local canvas instead of overwriting an existing one

You can create, rename, delete, and open multiple canvases from the list page or the in-studio `Canvases` dialog. Export is available from the studio page. Import is available from both the list page and the studio page.

## Run locally

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

The first screen is the canvas list page. From there you can create a canvas or import an existing JSON export.

Inside a canvas, open the `Providers` button and save what you need:

- `Cyberbara API Key` for Cyberbara text, image, video, and upload flows
- `OpenRouter API Key` if you want text nodes to run on OpenRouter instead
- `Replicate API Token` if you want to run image or video nodes on Replicate instead
- optional `S3-compatible` storage settings if you want uploads to go to your own object storage

The form validates provider values before saving:

- invalid URLs are rejected
- `Cyberbara API Key` is required when Cyberbara uploads are enabled
- S3 endpoint, access key, secret key, and bucket are required when storage is enabled
- saved values are also written to a local cookie so the server-side execution routes can read them

If you leave storage disabled, upload buttons stay unavailable because no storage provider can accept the file.

## Model expectations

This repo does not hardcode provider catalogs yet. You supply the model string on each node.

Examples:

- text node: an OpenRouter-compatible chat model
- image node: a Cyberbara model slug such as `nano-banana-pro`, or a Replicate model slug
- video node: a Cyberbara model slug such as `seedance-1-lite`, or a Replicate model slug

For Replicate nodes, the advanced JSON box is merged into the request `input`.

For Cyberbara image and video nodes, the advanced JSON box becomes the request `options` object. The app also infers the `scene` automatically:

- `text-to-image` / `image-to-image`
- `text-to-video` / `image-to-video` / `video-to-video`

The canvas applies these rules:

- if `input.prompt` is missing, it fills it from the node prompt
- if an upstream media node exists and you did not set your own image field, it injects that media URL into a common image input field
- if a Cyberbara media node has upstream media and you did not set your own `image_input` or `video_input`, it injects those values automatically

## Known limitations in this first cut

- no auth or multi-user sync
- no auth-gated or multi-tenant hosted storage workflow
- no template gallery
- no share links
- no execution queue
- no provider-specific dynamic form generation from model schemas yet
- no model catalog yet
- Cyberbara text currently depends on the Gemini 3 Flash endpoint that the main product stack uses, not the documented public media API surface

## Extraction roadmap

### Phase 1

- local-first standalone app
- BYOK provider execution
- JSON import and export

### Phase 2

- extract current pure canvas graph logic from Cyberbara into a shared package
- move node schemas and execution descriptors into `packages/canvas-core`
- add provider adapters as separate packages

### Phase 3

- community-maintained model registry
- provider-specific settings panels
- pluggable persistence layers such as IndexedDB, SQLite, Supabase, or file-backed local mode

## Why this shape

The production Cyberbara canvas is tightly coupled to auth, cloud persistence, moderation, credit accounting, and task orchestration.

This repo takes a different stance:

- keep the real studio shell experience where possible
- replace hosted persistence with a local JSON store
- keep provider adapters replaceable
- keep user secrets local by default

## Publishing

Before you publish this repo, read [RELEASING.md](./RELEASING.md).

The short version:

- confirm you have the right to publish every file in this repo
- choose your public repo name and description
- fill provider examples in the README
- test a full flow with your own OpenRouter, Cyberbara, Replicate, and storage credentials

Contribution guidelines live in [CONTRIBUTING.md](./CONTRIBUTING.md).
