# A-GW-N Go Proxy

这个目录是 `/v1/*` 的 Go 中转服务骨架，当前负责：

- 提供 `/healthz`
- 提供 `/v1/chat/completions`
- 提供 `/v1/messages`
- 提供 `/v1/models`
- 从 `gateway_profiles` 读取主配置
- 从 `account_pool_registry` 和 `list_pool_tables()` 扫描账号池
- 将调用日志写入 `gateway_request_logs`

## 环境变量

在项目根目录 `.env` 中至少准备：

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
# 可选：数据库 key 尚未初始化时使用的环境变量回退 key
GATEWAY_API_KEYS=sk-change-me
GO_PROXY_HOST=0.0.0.0
GO_PROXY_PORT=8081
GO_PROXY_BASE_URL=http://127.0.0.1:8081
```

Next.js 的 `app/v1/[...segments]/route.ts` 会把 `/v1/*` 请求转发到 `GO_PROXY_BASE_URL`。

现在 `/v1/*` 请求必须带鉴权密钥，支持：

- `Authorization: Bearer sk-...`
- `x-api-key: sk-...`

## 数据库准备

推荐直接执行：

- `supabase/schema.sql`

这份脚本已经包含当前项目完整 public schema：

- `gateway_profiles`
- `gateway_api_keys`
- `gateway_request_logs`
- `statistics_*`
- `statistics_cards`
- `account_pool_registry`
- `user_accounts`
- `user_sessions`
- `list_pool_tables(pattern text)`
- `gateway_api_key_usage`

## 本地启动

```powershell
cd E:\check-cx\backend\go-proxy
go run .\cmd\server
```

如果你的本机 Go 环境正常，服务默认监听：

- `http://127.0.0.1:8081`

## 当前说明

- 当前实现优先保证管理端配置、请求透传、模型映射、品牌映射、工具/图片计数与日志入库链路完整。
- 当前版本已经对 `/v1` 增加双层鉴权，并对 `gateway_profiles`、`account_pool_registry` 与 `list_pool_tables()` 做了暴露面收紧。
- 正式推荐在 `/admin/management` 里创建和管理数据库版网关 key；`.env` 的 `GATEWAY_API_KEYS` 仅作为应急回退。
