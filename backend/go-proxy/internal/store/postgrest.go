package store

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"agwn-go-proxy/internal/openai"
)

type PostgresStore struct {
	baseURL    string
	serviceKey string
	client     *http.Client
}

func NewPostgrestStore(supabaseURL string, serviceKey string) (*PostgresStore, error) {
	if supabaseURL == "" || serviceKey == "" {
		return nil, fmt.Errorf("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
	}

	return &PostgresStore{
		baseURL:    strings.TrimRight(supabaseURL, "/"),
		serviceKey: serviceKey,
		client:     &http.Client{Timeout: 30 * time.Second},
	}, nil
}

func (s *PostgresStore) Close() error {
	return nil
}

func (s *PostgresStore) LoadPrimaryProfile(ctx context.Context) (*openai.GatewayProfile, error) {
	requestURL := fmt.Sprintf(
		"%s/rest/v1/gateway_profiles?select=id,profile_key,display_name,provider_slug,endpoint_url,auth_mode,auth_token,request_mode,model_mappings,brand_mappings,default_headers,extra_payload,pool_table_pattern,is_enabled&is_enabled=eq.true&order=created_at.asc&limit=1",
		s.baseURL,
	)
	body, err := s.request(ctx, http.MethodGet, requestURL, nil, "application/json")
	if err != nil {
		return nil, normalizeSchemaError("gateway_profiles", err)
	}

	var rows []struct {
		ID               string            `json:"id"`
		ProfileKey       string            `json:"profile_key"`
		DisplayName      string            `json:"display_name"`
		ProviderSlug     string            `json:"provider_slug"`
		EndpointURL      string            `json:"endpoint_url"`
		AuthMode         string            `json:"auth_mode"`
		AuthToken        string            `json:"auth_token"`
		RequestMode      string            `json:"request_mode"`
		ModelMappings    map[string]string `json:"model_mappings"`
		BrandMappings    map[string]string `json:"brand_mappings"`
		DefaultHeaders   map[string]string `json:"default_headers"`
		ExtraPayload     map[string]any    `json:"extra_payload"`
		PoolTablePattern string            `json:"pool_table_pattern"`
		IsEnabled        bool              `json:"is_enabled"`
	}

	if err := json.Unmarshal(body, &rows); err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return nil, fmt.Errorf("no enabled gateway profile found")
	}

	row := rows[0]
	return &openai.GatewayProfile{
		ID:               row.ID,
		ProfileKey:       row.ProfileKey,
		DisplayName:      row.DisplayName,
		ProviderSlug:     row.ProviderSlug,
		EndpointURL:      row.EndpointURL,
		AuthMode:         row.AuthMode,
		AuthToken:        row.AuthToken,
		RequestMode:      row.RequestMode,
		ModelMappings:    row.ModelMappings,
		BrandMappings:    row.BrandMappings,
		DefaultHeaders:   row.DefaultHeaders,
		ExtraPayload:     row.ExtraPayload,
		PoolTablePattern: row.PoolTablePattern,
		IsEnabled:        row.IsEnabled,
	}, nil
}

func (s *PostgresStore) LoadActivePools(ctx context.Context) ([]openai.AccountPool, error) {
	requestURL := fmt.Sprintf(
		"%s/rest/v1/account_pool_registry?select=pool_key,table_name,display_name,brand,metadata,is_enabled&is_enabled=eq.true&order=created_at.asc",
		s.baseURL,
	)
	body, err := s.request(ctx, http.MethodGet, requestURL, nil, "application/json")
	if err != nil {
		return nil, normalizeSchemaError("account_pool_registry", err)
	}

	var rows []struct {
		PoolKey     string         `json:"pool_key"`
		TableName   string         `json:"table_name"`
		DisplayName string         `json:"display_name"`
		Brand       string         `json:"brand"`
		Metadata    map[string]any `json:"metadata"`
		IsEnabled   bool           `json:"is_enabled"`
	}
	if err := json.Unmarshal(body, &rows); err != nil {
		return nil, err
	}

	result := make([]openai.AccountPool, 0, len(rows))
	for _, row := range rows {
		result = append(result, openai.AccountPool{
			PoolKey:     row.PoolKey,
			TableName:   row.TableName,
			DisplayName: row.DisplayName,
			Brand:       row.Brand,
			Metadata:    row.Metadata,
			IsEnabled:   row.IsEnabled,
		})
	}
	return result, nil
}

func (s *PostgresStore) LoadGatewayAPIKeys(ctx context.Context) ([]openai.GatewayAPIKey, error) {
	requestURL := fmt.Sprintf(
		"%s/rest/v1/gateway_api_keys?select=id,key_name,key_prefix,secret_hash,owner_user_id,is_enabled&is_enabled=eq.true&order=created_at.asc",
		s.baseURL,
	)
	body, err := s.request(ctx, http.MethodGet, requestURL, nil, "application/json")
	if err != nil {
		return nil, normalizeSchemaError("gateway_api_keys", err)
	}

	var rows []struct {
		ID          string `json:"id"`
		KeyName     string `json:"key_name"`
		KeyPrefix   string `json:"key_prefix"`
		SecretHash  string `json:"secret_hash"`
		OwnerUserID string `json:"owner_user_id"`
		IsEnabled   bool   `json:"is_enabled"`
	}
	if err := json.Unmarshal(body, &rows); err != nil {
		return nil, err
	}

	result := make([]openai.GatewayAPIKey, 0, len(rows))
	for _, row := range rows {
		result = append(result, openai.GatewayAPIKey{
			ID:          row.ID,
			KeyName:     row.KeyName,
			KeyPrefix:   row.KeyPrefix,
			SecretHash:  row.SecretHash,
			OwnerUserID: row.OwnerUserID,
			IsEnabled:   row.IsEnabled,
		})
	}

	return result, nil
}

func (s *PostgresStore) InsertRequestLog(ctx context.Context, entry openai.RequestLog) error {
	payload := map[string]any{
		"request_id":             entry.RequestID,
		"profile_id":             emptyToNil(entry.ProfileID),
		"gateway_api_key_id":     emptyToNil(entry.GatewayAPIKeyID),
		"gateway_api_key_name":   emptyToNil(entry.GatewayAPIKeyName),
		"gateway_api_key_prefix": emptyToNil(entry.GatewayAPIKeyPrefix),
		"user_id":                emptyToNil(entry.UserID),
		"external_model":         entry.ExternalModel,
		"mapped_model":           entry.MappedModel,
		"brand":                  entry.Brand,
		"request_mode":           entry.RequestMode,
		"success":                entry.Success,
		"status_code":            zeroToNil(entry.StatusCode),
		"latency_ms":             zeroToNil(entry.LatencyMS),
		"input_tokens":           zeroToNil(entry.InputTokens),
		"output_tokens":          zeroToNil(entry.OutputTokens),
		"total_tokens":           zeroToNil(entry.TotalTokens),
		"rpm_count":              zeroToNil(entry.RPMCount),
		"tpm_count":              zeroToNil(entry.TPMCount),
		"pool_table_name":        emptyToNil(entry.PoolTableName),
		"pool_record_id":         emptyToNil(entry.PoolRecordID),
		"tool_count":             zeroToNil(entry.ToolCount),
		"image_count":            zeroToNil(entry.ImageCount),
		"error_message":          emptyToNil(entry.ErrorMessage),
		"metadata":               entry.Metadata,
	}

	requestURL := fmt.Sprintf("%s/rest/v1/gateway_request_logs", s.baseURL)
	_, err := s.request(ctx, http.MethodPost, requestURL, payload, "application/vnd.pgrst.object+json")
	return err
}

func (s *PostgresStore) request(ctx context.Context, method string, rawURL string, payload any, accept string) ([]byte, error) {
	var body io.Reader
	if payload != nil {
		encoded, err := json.Marshal(payload)
		if err != nil {
			return nil, err
		}
		body = bytes.NewReader(encoded)
	}

	req, err := http.NewRequestWithContext(ctx, method, rawURL, body)
	if err != nil {
		return nil, err
	}

	req.Header.Set("apikey", s.serviceKey)
	req.Header.Set("Authorization", "Bearer "+s.serviceKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", accept)
	req.Header.Set("Prefer", "return=representation")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("postgrest request failed: %s", strings.TrimSpace(string(respBody)))
	}

	return respBody, nil
}

func QueryValue(value string) string {
	return url.QueryEscape(value)
}

func (s *PostgresStore) ListDynamicPoolTables(ctx context.Context, pattern string) ([]string, error) {
	if strings.TrimSpace(pattern) == "" {
		pattern = "%-pool"
	}

	requestURL := fmt.Sprintf("%s/rest/v1/rpc/list_pool_tables", s.baseURL)
	body, err := s.request(ctx, http.MethodPost, requestURL, map[string]any{
		"pattern": pattern,
	}, "application/json")
	if err != nil {
		return nil, normalizeSchemaError("list_pool_tables", err)
	}

	var rows []struct {
		TableName string `json:"table_name"`
	}
	if err := json.Unmarshal(body, &rows); err != nil {
		return nil, err
	}

	result := make([]string, 0, len(rows))
	for _, row := range rows {
		if strings.TrimSpace(row.TableName) == "" {
			continue
		}
		result = append(result, row.TableName)
	}

	return result, nil
}

func emptyToNil(value string) any {
	if value == "" {
		return nil
	}
	return value
}

func zeroToNil(value int) any {
	if value == 0 {
		return nil
	}
	return value
}

func normalizeSchemaError(target string, err error) error {
	if err == nil {
		return nil
	}

	message := err.Error()
	switch {
	case strings.Contains(message, "PGRST205") && strings.Contains(message, "gateway_profiles"):
		return errors.New("gateway_profiles table is missing; apply supabase/schema.sql")
	case strings.Contains(message, "PGRST205") && strings.Contains(message, "account_pool_registry"):
		return errors.New("account_pool_registry table is missing; apply supabase/schema.sql")
	case strings.Contains(message, "PGRST205") && strings.Contains(message, "gateway_api_keys"):
		return errors.New("gateway_api_keys table is missing; apply supabase/schema.sql")
	case strings.Contains(message, "PGRST202") && strings.Contains(message, "list_pool_tables"):
		return errors.New("list_pool_tables() RPC is missing; apply supabase/schema.sql")
	default:
		return err
	}
}
