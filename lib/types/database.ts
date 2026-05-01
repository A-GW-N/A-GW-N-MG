/**
 * 数据库表类型定义
 * 对应 Supabase 的模型、配置与历史表
 */

/**
 * check_models 表的行类型
 */
export interface CheckModelRow {
  id: string;
  type: string;
  model: string;
  template_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * check_configs 表的行类型
 */
export interface CheckConfigRow {
  id: string;
  name: string;
  type: string;
  model_id: string;
  endpoint: string;
  api_key: string;
  enabled: boolean;
  is_maintenance: boolean;
  group_name?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * check_request_templates 表的行类型
 */
export interface CheckRequestTemplateRow {
  id: string;
  name: string;
  type: string;
  request_header?: Record<string, string> | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * check_history 表的行类型
 */
export interface CheckHistoryRow {
  id: string;
  config_id: string;
  status: string;
  latency_ms: number | null;
  ping_latency_ms: number | null;
  checked_at: string;
  message: string | null;
}

/**
 * availability_stats 视图的行类型
 */
export interface AvailabilityStats {
  config_id: string;
  period: "7d" | "15d" | "30d";
  total_checks: number;
  operational_count: number;
  availability_pct: number | null;
}

/**
 * group_info 表的行类型
 */
export interface GroupInfoRow {
  id: string;
  group_name: string;
  website_url?: string | null;
  tags?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * system_notifications 表的行类型
 */
export interface SystemNotificationRow {
  id: string;
  message: string;
  is_active: boolean;
  level: "info" | "warning" | "error";
  created_at: string;
}

/**
 * homepage_blocks 表的行类型
 */
export interface HomepageBlockRow {
  id: string;
  slug: string;
  title: string;
  href: string;
  description: string;
  status_label: string;
  image_data_url?: string | null;
  col_span: number;
  row_span: number;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * homepage_content 表的行类型
 */
export interface HomepageContentRow {
  content_key: string;
  title: string;
  hero_title?: string | null;
  hero_subtitle?: string | null;
  markdown: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * statistics_overview 表的行类型
 */
export interface StatisticsOverviewRow {
  snapshot_key: string;
  total_usage: number;
  rpm: number;
  tpm: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * statistics_request_trends 表的行类型
 */
export interface StatisticsRequestTrendRow {
  id: string;
  bucket_at: string;
  success_count: number;
  failed_count: number;
  created_at?: string;
}

/**
 * statistics_brand_usage 表的行类型
 */
export interface StatisticsBrandUsageRow {
  brand: string;
  usage_count: number;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * statistics_daily_usage 表的行类型
 */
export interface StatisticsDailyUsageRow {
  bucket_date: string;
  usage_total: number;
  created_at?: string;
}

/**
 * statistics_hourly_usage 表的行类型
 */
export interface StatisticsHourlyUsageRow {
  bucket_hour: string;
  usage_total: number;
  created_at?: string;
}

/**
 * statistics_model_rankings 表的行类型
 */
export interface StatisticsModelRankingRow {
  id: string;
  model_name: string;
  brand: string;
  usage_total: number;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * statistics_account_pools 表的行类型
 */
export interface StatisticsAccountPoolRow {
  id: string;
  pool_name: string;
  total_accounts: number;
  active_accounts: number;
  status_label: string;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * gateway_profiles 表的行类型
 */
export interface GatewayProfileRow {
  id: string;
  profile_key: string;
  display_name: string;
  provider_slug: string;
  endpoint_url: string;
  auth_mode: "bearer" | "api_key" | "none";
  auth_token?: string | null;
  request_mode: "openai" | "messages";
  model_mappings?: Record<string, string> | null;
  brand_mappings?: Record<string, string> | null;
  default_headers?: Record<string, string> | null;
  extra_payload?: Record<string, unknown> | null;
  pool_table_pattern?: string | null;
  is_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * gateway_api_keys 表的行类型
 */
export interface GatewayApiKeyRow {
  id: string;
  key_name: string;
  key_prefix: string;
  secret_hash: string;
  encrypted_key?: string | null;
  description?: string | null;
  key_scope?: "admin" | "user";
  owner_user_id?: string | null;
  is_enabled: boolean;
  last_used_at?: string | null;
  last_used_request_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * gateway_api_key_usage 视图的行类型
 */
export interface GatewayApiKeyUsageRow {
  gateway_api_key_id: string;
  request_count: number;
  success_count: number;
  failed_count: number;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  rpm_count?: number | null;
  tpm_count?: number | null;
  last_used_at?: string | null;
}

/**
 * gateway_request_logs 表的行类型
 */
export interface GatewayRequestLogRow {
  id: string;
  request_id: string;
  profile_id?: string | null;
  gateway_api_key_id?: string | null;
  gateway_api_key_name?: string | null;
  gateway_api_key_prefix?: string | null;
  user_id?: string | null;
  external_model: string;
  mapped_model: string;
  brand: string;
  request_mode: string;
  success: boolean;
  status_code?: number | null;
  latency_ms?: number | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  total_tokens?: number | null;
  rpm_count?: number | null;
  tpm_count?: number | null;
  pool_table_name?: string | null;
  pool_record_id?: string | null;
  tool_count?: number | null;
  image_count?: number | null;
  error_message?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
}

/**
 * auth_event_logs 表的行类型
 */
export interface AuthEventLogRow {
  id: string;
  category: "login" | "logout" | "access" | "error";
  event_type: string;
  success: boolean;
  auth_scope: "user" | "admin";
  actor_user_id?: string | null;
  actor_username?: string | null;
  actor_display_name?: string | null;
  actor_role?: string | null;
  provider?: string | null;
  target_path?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
}

/**
 * statistics_cards 表的行类型
 */
export interface StatisticsCardRow {
  id: string;
  card_key: string;
  title: string;
  card_type: string;
  description?: string | null;
  sort_order: number;
  is_enabled: boolean;
  settings?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * account_pool_registry 表的行类型
 */
export interface AccountPoolRegistryRow {
  id: string;
  pool_key: string;
  table_name: string;
  display_name: string;
  brand?: string | null;
  metadata?: Record<string, unknown> | null;
  is_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * user_accounts 表的行类型
 */
export interface UserAccountRow {
  id: string;
  username: string;
  password_hash: string;
  display_name: string;
  auth_source?: "manual" | "linuxdo";
  oauth_provider?: string | null;
  oauth_subject?: string | null;
  oauth_username?: string | null;
  avatar_url?: string | null;
  profile_raw?: Record<string, unknown> | null;
  last_login_at?: string | null;
  role: "user" | "admin";
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * user_registration_settings 表的行类型
 */
export interface UserRegistrationSettingsRow {
  settings_key: string;
  registration_mode: "closed" | "open" | "invite_only";
  invite_code_hint?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * user_invite_codes 表的行类型
 */
export interface UserInviteCodeRow {
  id: string;
  code: string;
  note?: string | null;
  is_enabled: boolean;
  expires_at?: string | null;
  used_by_user_id?: string | null;
  used_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * user_sessions 表的行类型
 */
export interface UserSessionRow {
  id: string;
  user_id: string;
  session_token_hash: string;
  expires_at: string;
  created_at?: string;
}
