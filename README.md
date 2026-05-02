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
- [`linux-do/credit`](https://github.com/linux-do/credit)
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
APP_BASE_URL=https://your-public-domain.example.com

LINUXDO_OAUTH_CLIENT_ID=...
LINUXDO_OAUTH_CLIENT_SECRET=...
LINUXDO_OAUTH_CALLBACK_URL=
LINUXDO_OAUTH_MINIMUM_TRUST_LEVEL=0

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
- Linux.do 服务端 token / userinfo 默认使用 `connect.linuxdo.org`；浏览器授权入口默认使用 `connect.linux.do`。
- `LINUXDO_OAUTH_MINIMUM_TRUST_LEVEL` 可限制 Linux.do 用户最低信任等级，默认 `0`。
- 生产环境务必设置 `APP_BASE_URL` 为站点公网地址，例如 `https://your-domain.example.com`。
- Docker / 反向代理环境建议将 `LINUXDO_OAUTH_CALLBACK_URL` 留空，让系统基于 `APP_BASE_URL` 或 `X-Forwarded-*` 头自动推导回调地址。
- 如果必须显式填写 `LINUXDO_OAUTH_CALLBACK_URL`，必须使用公网回调地址，不能写成 `localhost`、`127.0.0.1`、`0.0.0.0` 或容器内地址。

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

当前代码实际依赖并已在 `supabase/schema.sql` 中定义的数据库对象包括：

- 核心表：`check_request_templates`、`check_models`、`check_configs`、`check_history`、`group_info`、`system_notifications`
- 主页与后台表：`homepage_blocks`、`homepage_content`、`check_poller_leases`
- 网关表：`gateway_profiles`、`gateway_api_keys`、`gateway_request_logs`、`account_pool_registry`
- 用户与认证表：`auth_event_logs`、`user_accounts`、`user_sessions`、`user_registration_settings`、`user_invite_codes`
- 统计表：`statistics_overview`、`statistics_request_trends`、`statistics_brand_usage`、`statistics_daily_usage`、`statistics_hourly_usage`、`statistics_model_rankings`、`statistics_account_pools`、`statistics_cards`
- 视图：`gateway_api_key_usage`、`gateway_user_usage_summary`、`gateway_user_model_usage`、`availability_stats`
- RPC / 函数：`get_recent_check_history`、`prune_check_history`、`list_pool_tables`

结论：

- 当前 `supabase/schema.sql` 对本仓库主流程是完整的，没有发现代码已使用但脚本缺失的固定表、视图或函数。
- 唯一的“非固定结构”是账号池业务表，项目通过 `account_pool_registry` 和 `list_pool_tables()` 管理，这类 `{name}-pool` 表属于按业务扩展的数据表，不在基础初始化脚本中批量预置。

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

本地从源码构建并启动：

```bash
docker compose up -d --build
```

使用已发布镜像启动：

```bash
APP_IMAGE=ghcr.io/<owner>/<repo>:latest docker compose up -d
```

或指定 tag：

```bash
APP_IMAGE=ghcr.io/<owner>/<repo>:v1.22.0 docker compose up -d
```

停止：

```bash
docker compose down
```

Linux.do OAuth 在 Docker / 反向代理环境下的部署建议：

```env
APP_BASE_URL=https://your-domain.example.com
LINUXDO_OAUTH_CALLBACK_URL=
LINUXDO_OAUTH_MINIMUM_TRUST_LEVEL=0
```

说明：

- 优先使用 `APP_BASE_URL` 指向公网域名。
- 推荐留空 `LINUXDO_OAUTH_CALLBACK_URL`，系统会自动生成 `https://your-domain.example.com/api/user/oauth/linuxdo/callback`。
- 如果你在 Linux.do 应用后台登记了固定回调地址，请保证它与实际公网域名完全一致。
- 不要把回调地址配置成 `http://localhost:3000/...`，这只适用于本地开发。
- 如需限制注册用户质量，可设置 `LINUXDO_OAUTH_MINIMUM_TRUST_LEVEL`；登录时还会拒绝未激活或已禁言的 Linux.do 账户。

GitHub Actions 会自动执行：

- PR、`main` 分支提交、手动触发时执行 Web/Go 构建校验
- `main` 分支与 `v*` tag 自动构建 Docker 镜像并推送到 `GHCR`
- 自动生成源码包与部署包 artifact（`.tar.gz` 与 `.zip`）
- 推送 `v*` tag 时自动创建 GitHub Release，并附带 Docker 镜像包（`.tar`）

发布产物包括：

- 源码包：完整仓库快照
- 部署包：`Dockerfile`、`docker-compose.yml`、`.env.example`、`supabase/schema.sql` 等部署必需文件
- Docker 镜像：`ghcr.io/<owner>/<repo>:latest`、`ghcr.io/<owner>/<repo>:v*`

部署后统一从主站域名调用：

```text
https://your-domain/v1/chat/completions
https://your-domain/v1/models
```

## 推荐管理入口

- `/admin`：总控后台
- `/admin/auth-logs`：认证登录日志与 OAuth 排障入口
- `/admin/management`：密钥与安全管理
- `/admin/user-management`：用户与邀请码管理
- `/admin/statistics-management`：统计与中转配置管理
- `/user`：用户中心

## 登录排障

当 Linux.do 登录失败时，建议优先查看：

- 后台页面：`/admin/auth-logs`
- 数据库表：`public.auth_event_logs`

重点关注这些字段：

- `event_type`：例如 `linuxdo_oauth_start`、`linuxdo_oauth_state_invalid`、`linuxdo_oauth_login_failed`
- `request_host`、`request_origin`：服务端识别到的公网域名
- `x_forwarded_host`、`x_forwarded_proto`：反向代理传入的对外地址
- `cookie_names`、`cookie_count`：回调时是否带回 `agwn_user_oauth_state`
- `expected_state_present`：`false` 通常表示 state cookie 丢失
- `internal_error`：服务端内部异常文本，适合排查 token 交换、用户资料获取、数据库写入等后续失败
- `linuxdo_trust_level`、`linuxdo_active`、`linuxdo_silenced`：Linux.do 用户状态与信任等级

常见问题：

- 回调域名不一致：开始授权和回调落地不是同一个公网域名，导致 state cookie 丢失。
- 容器内地址误配置：把 `LINUXDO_OAUTH_CALLBACK_URL` 写成 `localhost` 或容器地址，线上会出现 OAuth 校验异常或后续失败。
- 反代头不完整：如果 `X-Forwarded-Host` / `X-Forwarded-Proto` 没正确传递，日志和回跳地址都会失真。
- token 接口返回 HTML：常见于 Linux.do / Cloudflare 挑战页；服务端已使用 Basic Auth 与浏览器式请求头，日志中如果仍是 `status=403, content-type=text/html`，优先检查部署出口网络。
- Linux.do 用户状态不满足：未激活、已禁言或信任等级低于 `LINUXDO_OAUTH_MINIMUM_TRUST_LEVEL` 会被拒绝。

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
