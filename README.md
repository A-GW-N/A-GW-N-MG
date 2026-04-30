# A-GW-N-MG

A-GW-N-MG是一个基于 `Next.js + React + Go + PostgreSQL/Supabase` 的一体化 AI 网关与状态面板项目。

它把几类能力合并到了同一个仓库里：

- 主页导航与信息板
- `/check` 健康检测面板
- `/statistics` 请求与用量统计面板
- `/user` 用户中心与 Linux.do OAuth2 登录
- `/admin` 后台管理
- `/v1/*` OpenAI 兼容网关入口

## 技术栈

- 前端：Next.js 16、React 19、TypeScript、Tailwind CSS
- 后端：Go 1.24
- 数据库：PostgreSQL / Supabase
- 部署：Docker 单仓部署

## 项目来源

本项目基于以下开源项目进行定制化改造与整合：

- [`BingZi-233/check-cx`](https://github.com/BingZi-233/check-cx)
- [`router-for-me/CLIProxyAPI`](https://github.com/router-for-me/CLIProxyAPI)

当前仓库并不是上述项目的原样分支，而是在其基础上做了整合式魔改，加入了统一主页、管理后台、统计系统、用户体系、网关密钥体系与 Go 中转落库能力。

## 主要能力

- 统一网关入口：`/v1/chat/completions`、`/v1/models`
- 支持 OpenAI 兼容请求转发与模型映射
- 支持 Linux.do OAuth2 登录
- 支持管理员后台维护主页、用户、邀请码、网关配置和统计卡片
- 支持请求日志、token、RPM、TPM、品牌分布、模型排行统计
- 支持数据库版网关 `sk` 管理和按 key 统计

## 目录结构

```text
app/                  Next.js App Router 页面与 API
backend/go-proxy/     Go 网关代理服务
components/           前端组件
lib/                  数据库、认证、网关、业务逻辑
public/               静态资源
supabase/schema.sql   完整数据库初始化脚本
docker/               Docker 启动辅助脚本
Dockerfile            整体镜像构建文件
docker-compose.yml    本地/服务器整套服务启动文件
```

## 环境变量

复制 `.env.example` 为 `.env`，至少填写：

```env
SUPABASE_URL=...
SUPABASE_PUBLISHABLE_OR_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_PASSWORD=change-me

LINUXDO_OAUTH_CLIENT_ID=...
LINUXDO_OAUTH_CLIENT_SECRET=...
LINUXDO_OAUTH_CALLBACK_URL=http://localhost:3000/api/user/oauth/linuxdo/callback

GATEWAY_KEY_ENCRYPTION_SECRET=replace-with-a-long-random-secret
GATEWAY_API_KEYS=sk-change-me

GO_PROXY_BASE_URL=http://127.0.0.1:8081
GO_PROXY_HOST=0.0.0.0
GO_PROXY_PORT=8081

SUPABASE_DB_SCHEMA=public
CHECK_NODE_ID=local
CHECK_POLL_INTERVAL_SECONDS=300
HISTORY_RETENTION_DAYS=30
OFFICIAL_STATUS_CHECK_INTERVAL_SECONDS=300
CHECK_CONCURRENCY=5
```

说明：

- `GATEWAY_API_KEYS` 只建议作为应急回退 key。
- 正式环境建议进入 `/admin/management` 创建数据库版 key。
- `LINUXDO_OAUTH_*` 用于 `/user` 登录系统。

## 数据库初始化

本仓库现在只保留一份完整数据库脚本：

- [supabase/schema.sql](supabase/schema.sql)

在 Supabase SQL Editor 中直接执行整份脚本即可完成初始化。

这份脚本已经包含：

- 检测系统基础表
- 主页方块与信息板
- 统计表与统计卡片
- 网关 profile、API key、请求日志
- 用户、会话、邀请码、注册设置
- 视图、函数、索引、RLS、初始化数据

## 本地开发

安装依赖：

```bash
pnpm install
```

启动前端：

```bash
pnpm dev
```

单独启动 Go 代理：

```bash
pnpm dev:go
```

前后端一起启动：

```bash
pnpm dev:full
```

## 构建与运行

```bash
pnpm lint
pnpm build
pnpm start
```

Go 代理编译：

```bash
cd backend/go-proxy
go build ./...
```

## Docker 部署

项目根目录已经提供整套部署入口：

- `Dockerfile`
- `docker-compose.yml`

启动：

```bash
docker compose up -d --build
```

停止：

```bash
docker compose down
```

GitHub Actions 会自动执行：

- `main` 分支提交时校验 Docker 构建
- 自动生成源码包 artifact（`.tar.gz` 与 `.zip`）
- 推送 `v*` tag 时额外生成可下载的 Docker 镜像包（`.tar`）

部署后统一从主站域名调用：

```text
https://your-domain/v1/chat/completions
https://your-domain/v1/models
```

## 推荐管理入口

- `/admin`：总控后台
- `/admin/management`：密钥与安全管理
- `/admin/user-management`：用户与邀请码管理
- `/admin/statistics-management`：统计与中转配置管理
- `/user`：用户中心

## 参考文档

- Next.js App Router
  https://nextjs.org/docs
- React
  https://react.dev/
- Supabase
  https://supabase.com/docs
- PostgreSQL
  https://www.postgresql.org/docs/
- Go
  https://go.dev/doc/

## 开源协议

本项目采用 MIT License，详见：

- [LICENSE](LICENSE)

第三方来源与致谢说明见：

- [NOTICE](NOTICE)
