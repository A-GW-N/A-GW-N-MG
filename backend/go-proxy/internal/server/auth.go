package server

import (
	"context"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"net/http"
	"strings"

	"agwn-go-proxy/internal/openai"
)

type authResult struct {
	KeyID     string
	KeyName   string
	KeyPrefix string
	UserID    string
}

func (s *Server) authenticateRequest(ctx context.Context, r *http.Request) (authResult, int, string, bool) {
	providedKey := extractAPIKey(r.Header)
	if !strings.HasPrefix(providedKey, "sk-") {
		return authResult{}, http.StatusUnauthorized, "missing or invalid api key", false
	}

	dbKeys, err := s.store.LoadGatewayAPIKeys(ctx)
	if err != nil {
		if len(s.gatewayAPIKeys) == 0 {
			return authResult{}, http.StatusServiceUnavailable, "gateway api keys are unavailable", false
		}
		dbKeys = nil
	}

	if matched, ok := matchDBGatewayAPIKey(dbKeys, providedKey); ok {
		return matched, 0, "", true
	}

	if matched, ok := matchEnvironmentGatewayAPIKey(s.gatewayAPIKeys, providedKey); ok {
		return matched, 0, "", true
	}

	if len(dbKeys) == 0 && len(s.gatewayAPIKeys) == 0 {
		return authResult{}, http.StatusServiceUnavailable, "gateway api keys are not configured", false
	}

	return authResult{}, http.StatusUnauthorized, "invalid api key", false
}

func matchDBGatewayAPIKey(keys []openai.GatewayAPIKey, providedKey string) (authResult, bool) {
	hashed := sha256.Sum256([]byte(providedKey))
	providedHash := hex.EncodeToString(hashed[:])
	providedBuffer := []byte(providedHash)

	for _, key := range keys {
		expectedBuffer := []byte(key.SecretHash)
		if len(expectedBuffer) != len(providedBuffer) {
			continue
		}
		if subtle.ConstantTimeCompare(expectedBuffer, providedBuffer) == 1 {
			return authResult{
				KeyID:     key.ID,
				KeyName:   key.KeyName,
				KeyPrefix: key.KeyPrefix,
				UserID:    key.OwnerUserID,
			}, true
		}
	}

	return authResult{}, false
}

func matchEnvironmentGatewayAPIKey(keys []string, providedKey string) (authResult, bool) {
	providedBuffer := []byte(providedKey)

	for _, key := range keys {
		expectedBuffer := []byte(key)
		if len(expectedBuffer) != len(providedBuffer) {
			continue
		}
		if subtle.ConstantTimeCompare(expectedBuffer, providedBuffer) == 1 {
			return authResult{
				KeyName:   "Environment Fallback",
				KeyPrefix: buildKeyPrefix(key),
			}, true
		}
	}

	return authResult{}, false
}

func extractAPIKey(headers http.Header) string {
	if authorization := strings.TrimSpace(headers.Get("Authorization")); authorization != "" {
		parts := strings.SplitN(authorization, " ", 2)
		if len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
			return strings.TrimSpace(parts[1])
		}
	}

	return strings.TrimSpace(headers.Get("X-API-Key"))
}

func buildKeyPrefix(rawKey string) string {
	if len(rawKey) <= 12 {
		return rawKey
	}
	return rawKey[:12] + "..."
}
