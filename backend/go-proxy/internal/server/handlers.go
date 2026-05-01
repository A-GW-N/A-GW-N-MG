package server

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"

	"agwn-go-proxy/internal/openai"
)

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) handleModels(w http.ResponseWriter, r *http.Request) {
	if _, statusCode, message, ok := s.authenticateRequest(r.Context(), r); !ok {
		writeJSON(w, statusCode, map[string]any{"error": message})
		return
	}

	profile, err := s.store.LoadPrimaryProfile(r.Context())
	if err != nil {
		log.Printf("failed to load primary profile for /v1/models: %v", err)
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"error": "gateway profile is unavailable"})
		return
	}

	forcedModel := forcedTargetModel(profile)
	if forcedModel != "" && len(profile.ModelMappings) == 0 {
		writeJSON(w, http.StatusOK, map[string]any{
			"object": "list",
			"data": []map[string]string{
				{
					"id":       forcedModel,
					"object":   "model",
					"owned_by": "agwn",
				},
			},
		})
		return
	}

	keys := make([]string, 0, len(profile.ModelMappings))
	for external := range profile.ModelMappings {
		keys = append(keys, external)
	}
	sort.Strings(keys)

	items := make([]map[string]string, 0, len(keys))
	for _, external := range keys {
		items = append(items, map[string]string{
			"id":       external,
			"object":   "model",
			"owned_by": "agwn",
		})
	}

	writeJSON(w, http.StatusOK, map[string]any{"object": "list", "data": items})
}

func (s *Server) handleChatCompletions(w http.ResponseWriter, r *http.Request) {
	s.proxyRequest(w, r, "openai")
}

func (s *Server) handleMessages(w http.ResponseWriter, r *http.Request) {
	s.proxyRequest(w, r, "messages")
}

func (s *Server) proxyRequest(w http.ResponseWriter, r *http.Request, incomingMode string) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"error": "method not allowed"})
		return
	}

	auth, authStatusCode, message, ok := s.authenticateRequest(r.Context(), r)
	if !ok {
		writeJSON(w, authStatusCode, map[string]any{"error": message})
		return
	}

	forwardedKeyID := firstNonEmpty(
		strings.TrimSpace(r.Header.Get("x-agwn-gateway-key-id")),
		auth.KeyID,
	)
	forwardedKeyName := firstNonEmpty(
		strings.TrimSpace(r.Header.Get("x-agwn-gateway-key-name")),
		auth.KeyName,
	)
	forwardedKeyPrefix := firstNonEmpty(
		strings.TrimSpace(r.Header.Get("x-agwn-gateway-key-prefix")),
		auth.KeyPrefix,
	)
	forwardedUserID := firstNonEmpty(
		strings.TrimSpace(r.Header.Get("x-agwn-user-id")),
		auth.UserID,
	)

	startedAt := time.Now()
	ctx := r.Context()
	requestID := buildRequestID()

	profile, err := s.store.LoadPrimaryProfile(ctx)
	if err != nil {
		log.Printf("failed to load primary profile for request %s: %v", requestID, err)
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"error": "no active gateway profile"})
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "failed to read request body"})
		return
	}

	requestMetadata := buildRequestMetadata(r, incomingMode, body)

	normalizedBody, externalModel, mappedModel, brand, toolCount, imageCount, err := normalizeRequestBody(body, profile, incomingMode)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}

	upstreamResponse, responseErr := s.forwardRequest(ctx, r.Header, profile, normalizedBody)
	if responseErr != nil {
		log.Printf("upstream request failed for %s: %v", requestID, responseErr)
		storeCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		if err := s.store.InsertRequestLog(storeCtx, openai.RequestLog{
			RequestID:           requestID,
			ProfileID:           profile.ID,
			GatewayAPIKeyID:     forwardedKeyID,
			GatewayAPIKeyName:   forwardedKeyName,
			GatewayAPIKeyPrefix: forwardedKeyPrefix,
			UserID:              forwardedUserID,
			ExternalModel:       externalModel,
			MappedModel:         mappedModel,
			Brand:               brand,
			RequestMode:         profile.RequestMode,
			Success:             false,
			StatusCode:          http.StatusBadGateway,
			LatencyMS:           int(time.Since(startedAt).Milliseconds()),
			RPMCount:            1,
			ToolCount:           toolCount,
			ImageCount:          imageCount,
			ErrorMessage:        errorMessage(responseErr),
			Metadata: mergeMetadata(requestMetadata, map[string]any{
				"profile_key":   profile.ProfileKey,
				"provider_slug": profile.ProviderSlug,
				"incoming_mode": incomingMode,
				"api_key_name":  forwardedKeyName,
			}),
		}); err != nil {
			log.Printf("failed to persist request log %s: %v", requestID, err)
		}

		writeJSON(w, http.StatusBadGateway, map[string]any{"error": "upstream request failed"})
		return
	}
	defer upstreamResponse.Body.Close()

	responseBody, relayErr := relayUpstreamResponse(w, upstreamResponse)
	responseStatusCode := upstreamResponse.StatusCode
	success := relayErr == nil && responseStatusCode < 400
	inputTokens, outputTokens, totalTokens := extractUsage(responseBody)

	storeCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	pools, poolErr := s.store.LoadActivePools(storeCtx)
	if poolErr != nil {
		log.Printf("failed to load active pools for request %s: %v", requestID, poolErr)
	}

	dynamicTables, dynamicErr := s.store.ListDynamicPoolTables(storeCtx, profile.PoolTablePattern)
	if dynamicErr != nil {
		log.Printf("failed to list dynamic pool tables for request %s: %v", requestID, dynamicErr)
	}

	selectedPoolName := firstPoolTableName(pools, dynamicTables)

	logErr := responseErr
	if logErr == nil {
		logErr = relayErr
	}

	if err := s.store.InsertRequestLog(storeCtx, openai.RequestLog{
		RequestID:           requestID,
		ProfileID:           profile.ID,
		GatewayAPIKeyID:     forwardedKeyID,
		GatewayAPIKeyName:   forwardedKeyName,
		GatewayAPIKeyPrefix: forwardedKeyPrefix,
		UserID:              forwardedUserID,
		ExternalModel:       externalModel,
		MappedModel:         mappedModel,
		Brand:               brand,
		RequestMode:         profile.RequestMode,
		Success:             success,
		StatusCode:          responseStatusCode,
		LatencyMS:           int(time.Since(startedAt).Milliseconds()),
		InputTokens:         inputTokens,
		OutputTokens:        outputTokens,
		TotalTokens:         totalTokens,
		RPMCount:            1,
		TPMCount:            totalTokens,
		PoolTableName:       selectedPoolName,
		ToolCount:           toolCount,
		ImageCount:          imageCount,
		ErrorMessage:        errorMessage(logErr),
		Metadata: mergeMetadata(requestMetadata, map[string]any{
			"profile_key":        profile.ProfileKey,
			"provider_slug":      profile.ProviderSlug,
			"dynamic_pool_table": selectedPoolName,
			"incoming_mode":      incomingMode,
			"api_key_name":       forwardedKeyName,
		}),
	}); err != nil {
		log.Printf("failed to persist request log %s: %v", requestID, err)
	}
}

func (s *Server) forwardRequest(
	ctx context.Context,
	incomingHeaders http.Header,
	profile *openai.GatewayProfile,
	body []byte,
) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, profile.EndpointURL, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}

	copyForwardHeaders(req.Header, incomingHeaders)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept-Encoding", "identity")

	for key, value := range profile.DefaultHeaders {
		if strings.TrimSpace(key) == "" {
			continue
		}
		req.Header.Set(key, value)
	}

	switch profile.AuthMode {
	case "bearer":
		if profile.AuthToken != "" {
			req.Header.Set("Authorization", "Bearer "+profile.AuthToken)
		}
	case "api_key":
		if profile.AuthToken != "" {
			req.Header.Set("x-api-key", profile.AuthToken)
		}
	case "none":
		req.Header.Del("Authorization")
	}

	client := &http.Client{Timeout: 60 * time.Second}
	return client.Do(req)
}

func normalizeRequestBody(
	body []byte,
	profile *openai.GatewayProfile,
	incomingMode string,
) ([]byte, string, string, string, int, int, error) {
	payload := map[string]any{}
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, "", "", "", 0, 0, errors.New("invalid JSON request body")
	}

	externalModel := stringValue(payload["model"])
	if externalModel == "" {
		externalModel = "unknown"
	}

	mappedModel := externalModel
	if target, ok := profile.ModelMappings[externalModel]; ok && strings.TrimSpace(target) != "" {
		mappedModel = target
	} else if forcedModel := forcedTargetModel(profile); forcedModel != "" {
		mappedModel = forcedModel
	}
	payload["model"] = mappedModel

	switch {
	case incomingMode == "openai" && profile.RequestMode == "messages":
		payload = convertOpenAIToMessagesPayload(payload)
	case incomingMode == "messages" && profile.RequestMode == "openai":
		payload = convertMessagesToOpenAIPayload(payload)
	}

	for key, value := range profile.ExtraPayload {
		if _, exists := payload[key]; !exists {
			payload[key] = value
		}
	}

	// When upstream supports OpenAI-style streaming usage, request it explicitly so
	// server-side statistics can still capture token counts from SSE responses.
	if streamEnabled, ok := payload["stream"].(bool); ok && streamEnabled {
		streamOptions, _ := payload["stream_options"].(map[string]any)
		if streamOptions == nil {
			streamOptions = map[string]any{}
		}
		if _, exists := streamOptions["include_usage"]; !exists {
			streamOptions["include_usage"] = true
		}
		payload["stream_options"] = streamOptions
	}

	toolCount := countTools(payload["tools"])
	imageCount := countImages(payload["messages"]) + countImages(payload["input"])
	brand := resolveBrand(profile, externalModel)

	encoded, err := json.Marshal(payload)
	if err != nil {
		return nil, "", "", "", 0, 0, err
	}

	return encoded, externalModel, mappedModel, brand, toolCount, imageCount, nil
}

func convertOpenAIToMessagesPayload(payload map[string]any) map[string]any {
	rawMessages, ok := payload["messages"].([]any)
	if !ok || len(rawMessages) == 0 {
		return payload
	}

	systemMessages := make([]string, 0, 1)
	normalizedMessages := make([]any, 0, len(rawMessages))

	for _, item := range rawMessages {
		message, ok := item.(map[string]any)
		if !ok {
			normalizedMessages = append(normalizedMessages, item)
			continue
		}

		if stringValue(message["role"]) == "system" {
			if text := extractTextContent(message["content"]); text != "" {
				systemMessages = append(systemMessages, text)
			}
			continue
		}

		normalizedMessages = append(normalizedMessages, message)
	}

	payload["messages"] = normalizedMessages
	if len(systemMessages) > 0 {
		if _, exists := payload["system"]; !exists {
			payload["system"] = strings.Join(systemMessages, "\n\n")
		}
	}

	if _, exists := payload["max_tokens"]; !exists {
		if value, ok := payload["max_completion_tokens"]; ok {
			payload["max_tokens"] = value
		}
	}

	delete(payload, "max_completion_tokens")
	delete(payload, "n")
	delete(payload, "presence_penalty")
	delete(payload, "frequency_penalty")

	return payload
}

func convertMessagesToOpenAIPayload(payload map[string]any) map[string]any {
	systemText := extractSystemText(payload["system"])
	rawMessages, _ := payload["messages"].([]any)
	if systemText != "" {
		payload["messages"] = prependSystemMessage(rawMessages, systemText)
	}

	delete(payload, "system")
	delete(payload, "anthropic_version")
	delete(payload, "anthropic-beta")

	return payload
}

func prependSystemMessage(messages []any, systemText string) []any {
	if strings.TrimSpace(systemText) == "" {
		return messages
	}

	systemMessage := map[string]any{
		"role":    "system",
		"content": systemText,
	}

	result := make([]any, 0, len(messages)+1)
	result = append(result, systemMessage)
	result = append(result, messages...)
	return result
}

func extractSystemText(value any) string {
	switch typed := value.(type) {
	case string:
		return strings.TrimSpace(typed)
	case []any:
		parts := make([]string, 0, len(typed))
		for _, item := range typed {
			itemMap, ok := item.(map[string]any)
			if !ok {
				continue
			}
			if text := stringValue(itemMap["text"]); text != "" {
				parts = append(parts, text)
			}
		}
		return strings.Join(parts, "\n\n")
	default:
		return ""
	}
}

func extractTextContent(value any) string {
	switch typed := value.(type) {
	case string:
		return strings.TrimSpace(typed)
	case []any:
		parts := make([]string, 0, len(typed))
		for _, item := range typed {
			itemMap, ok := item.(map[string]any)
			if !ok {
				continue
			}

			switch stringValue(itemMap["type"]) {
			case "text", "input_text":
				if text := stringValue(itemMap["text"]); text != "" {
					parts = append(parts, text)
				}
			}
		}
		return strings.Join(parts, "\n\n")
	default:
		return ""
	}
}

func resolveBrand(profile *openai.GatewayProfile, model string) string {
	if brand, ok := profile.BrandMappings[model]; ok && brand != "" {
		return brand
	}

	lowered := strings.ToLower(model)
	switch {
	case strings.Contains(lowered, "gpt"):
		return "gpt"
	case strings.Contains(lowered, "gemini"):
		return "gemini"
	case strings.Contains(lowered, "claude"):
		return "claude"
	default:
		return "other"
	}
}

func forcedTargetModel(profile *openai.GatewayProfile) string {
	if profile == nil {
		return ""
	}

	if explicitModel := stringValue(profile.ExtraPayload["model"]); strings.TrimSpace(explicitModel) != "" {
		return explicitModel
	}

	uniqueTargets := make([]string, 0, len(profile.ModelMappings))
	seen := make(map[string]struct{}, len(profile.ModelMappings))

	for _, mapped := range profile.ModelMappings {
		mapped = strings.TrimSpace(mapped)
		if mapped == "" {
			continue
		}
		if _, exists := seen[mapped]; exists {
			continue
		}
		seen[mapped] = struct{}{}
		uniqueTargets = append(uniqueTargets, mapped)
	}

	if len(uniqueTargets) == 1 {
		return uniqueTargets[0]
	}

	return ""
}

func countTools(value any) int {
	tools, ok := value.([]any)
	if ok {
		return len(tools)
	}

	typedTools, ok := value.([]map[string]any)
	if ok {
		return len(typedTools)
	}

	return 0
}

func countImages(value any) int {
	items, ok := value.([]any)
	if !ok {
		return 0
	}

	count := 0
	for _, item := range items {
		itemMap, ok := item.(map[string]any)
		if !ok {
			continue
		}

		if imageType := stringValue(itemMap["type"]); imageType == "image_url" || imageType == "input_image" {
			count++
		}

		if content, ok := itemMap["content"].([]any); ok {
			count += countImages(content)
		}
	}

	return count
}

func extractUsage(body []byte) (int, int, int) {
	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		return extractUsageFromSSE(body)
	}

	return usageFromPayload(payload)
}

func extractUsageFromSSE(body []byte) (int, int, int) {
	lines := strings.Split(string(body), "\n")
	for index := len(lines) - 1; index >= 0; index-- {
		line := strings.TrimSpace(lines[index])
		if line == "" || !strings.HasPrefix(line, "data:") {
			continue
		}

		data := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if data == "" || data == "[DONE]" {
			continue
		}

		var payload map[string]any
		if err := json.Unmarshal([]byte(data), &payload); err != nil {
			continue
		}

		inputTokens, outputTokens, totalTokens := usageFromPayload(payload)
		if inputTokens > 0 || outputTokens > 0 || totalTokens > 0 {
			return inputTokens, outputTokens, totalTokens
		}
	}

	return 0, 0, 0
}

func usageFromPayload(payload map[string]any) (int, int, int) {
	usage, ok := payload["usage"].(map[string]any)
	if !ok {
		return 0, 0, 0
	}

	inputTokens := int(numberValue(usage["input_tokens"]))
	if inputTokens == 0 {
		inputTokens = int(numberValue(usage["prompt_tokens"]))
	}

	outputTokens := int(numberValue(usage["output_tokens"]))
	if outputTokens == 0 {
		outputTokens = int(numberValue(usage["completion_tokens"]))
	}

	totalTokens := int(numberValue(usage["total_tokens"]))
	if totalTokens == 0 {
		totalTokens = inputTokens + outputTokens
	}

	return inputTokens, outputTokens, totalTokens
}

func relayUpstreamResponse(w http.ResponseWriter, response *http.Response) ([]byte, error) {
	copyResponseHeaders(w.Header(), response.Header)
	w.WriteHeader(response.StatusCode)

	flusher, _ := w.(http.Flusher)
	var buffer bytes.Buffer
	chunk := make([]byte, 32*1024)

	for {
		readCount, readErr := response.Body.Read(chunk)
		if readCount > 0 {
			part := chunk[:readCount]
			if _, err := buffer.Write(part); err != nil {
				return buffer.Bytes(), err
			}
			if _, err := w.Write(part); err != nil {
				return buffer.Bytes(), err
			}
			if flusher != nil {
				flusher.Flush()
			}
		}

		if readErr == nil {
			continue
		}
		if errors.Is(readErr, io.EOF) {
			return buffer.Bytes(), nil
		}
		return buffer.Bytes(), readErr
	}
}

func copyForwardHeaders(target http.Header, source http.Header) {
	for key, values := range source {
		if shouldSkipForwardHeader(key) {
			continue
		}
		for _, value := range values {
			target.Add(key, value)
		}
	}
}

func copyResponseHeaders(target http.Header, source http.Header) {
	for key, values := range source {
		if shouldSkipResponseHeader(key) {
			continue
		}
		target.Del(key)
		for _, value := range values {
			target.Add(key, value)
		}
	}
}

func shouldSkipForwardHeader(key string) bool {
	lowered := strings.ToLower(strings.TrimSpace(key))
	switch lowered {
	case "authorization",
		"connection",
		"content-length",
		"host",
		"keep-alive",
		"proxy-authenticate",
		"proxy-authorization",
		"te",
		"trailer",
		"transfer-encoding",
		"upgrade",
		"x-agwn-gateway-key-id",
		"x-agwn-gateway-key-name",
		"x-agwn-gateway-key-prefix",
		"x-agwn-user-id",
		"x-forwarded-for",
		"x-forwarded-host",
		"x-forwarded-proto":
		return true
	default:
		return false
	}
}

func shouldSkipResponseHeader(key string) bool {
	lowered := strings.ToLower(strings.TrimSpace(key))
	switch lowered {
	case "connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade":
		return true
	default:
		return false
	}
}

func firstPoolTableName(pools []openai.AccountPool, dynamicTables []string) string {
	if len(pools) > 0 && strings.TrimSpace(pools[0].TableName) != "" {
		return pools[0].TableName
	}
	if len(dynamicTables) > 0 {
		return dynamicTables[0]
	}
	return ""
}

func numberValue(value any) float64 {
	switch typed := value.(type) {
	case float64:
		return typed
	case int:
		return float64(typed)
	default:
		return 0
	}
}

func stringValue(value any) string {
	str, _ := value.(string)
	return str
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

func writeJSON(w http.ResponseWriter, statusCode int, payload map[string]any) {
	body, _ := json.Marshal(payload)
	writeRawJSON(w, statusCode, body)
}

func writeRawJSON(w http.ResponseWriter, statusCode int, body []byte) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_, _ = w.Write(body)
}

func errorMessage(err error) string {
	if err == nil {
		return ""
	}
	return err.Error()
}

func buildRequestMetadata(r *http.Request, incomingMode string, body []byte) map[string]any {
	return map[string]any{
		"http_method":        r.Method,
		"request_path":       r.URL.Path,
		"request_query":      sanitizeQuery(r.URL.Query()),
		"request_host":       r.Host,
		"request_remote_addr": r.RemoteAddr,
		"incoming_mode":      incomingMode,
		"user_agent":         truncateString(r.UserAgent(), 512),
		"content_length":     len(body),
		"content_type":       truncateString(r.Header.Get("Content-Type"), 256),
		"accept":             truncateString(r.Header.Get("Accept"), 256),
		"x_forwarded_for":    truncateString(r.Header.Get("X-Forwarded-For"), 512),
		"x_forwarded_host":   truncateString(r.Header.Get("X-Forwarded-Host"), 256),
		"x_forwarded_proto":  truncateString(r.Header.Get("X-Forwarded-Proto"), 64),
		"cf_connecting_ip":   truncateString(r.Header.Get("CF-Connecting-IP"), 128),
		"x_real_ip":          truncateString(r.Header.Get("X-Real-IP"), 128),
		"request_body_preview": buildBodyPreview(body),
	}
}

func sanitizeQuery(values url.Values) map[string]any {
	if len(values) == 0 {
		return map[string]any{}
	}

	result := make(map[string]any, len(values))
	for key, items := range values {
		lowerKey := strings.ToLower(strings.TrimSpace(key))
		if strings.Contains(lowerKey, "key") ||
			strings.Contains(lowerKey, "token") ||
			strings.Contains(lowerKey, "secret") ||
			strings.Contains(lowerKey, "password") {
			result[key] = "[redacted]"
			continue
		}

		if len(items) == 1 {
			result[key] = truncateString(items[0], 256)
			continue
		}

		sanitized := make([]string, 0, len(items))
		for _, item := range items {
			sanitized = append(sanitized, truncateString(item, 256))
		}
		result[key] = sanitized
	}

	return result
}

func buildBodyPreview(body []byte) any {
	if len(body) == 0 {
		return map[string]any{}
	}

	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err == nil {
		return sanitizePayload(payload)
	}

	return truncateString(string(body), 2000)
}

func sanitizePayload(payload map[string]any) map[string]any {
	result := make(map[string]any, len(payload))
	for key, value := range payload {
		lowerKey := strings.ToLower(strings.TrimSpace(key))
		switch {
		case lowerKey == "messages":
			result[key] = summarizeMessages(value)
		case lowerKey == "input":
			result[key] = summarizeInput(value)
		case strings.Contains(lowerKey, "key"),
			strings.Contains(lowerKey, "token"),
			strings.Contains(lowerKey, "secret"),
			strings.Contains(lowerKey, "password"),
			lowerKey == "authorization":
			result[key] = "[redacted]"
		default:
			result[key] = sanitizeValue(value)
		}
	}

	return result
}

func sanitizeValue(value any) any {
	switch typed := value.(type) {
	case string:
		return truncateString(typed, 600)
	case []any:
		items := make([]any, 0, len(typed))
		for index, item := range typed {
			if index >= 10 {
				items = append(items, "[truncated]")
				break
			}
			items = append(items, sanitizeValue(item))
		}
		return items
	case map[string]any:
		return sanitizePayload(typed)
	default:
		return value
	}
}

func summarizeMessages(value any) any {
	items, ok := value.([]any)
	if !ok {
		return sanitizeValue(value)
	}

	summary := make([]map[string]any, 0, len(items))
	for index, item := range items {
		if index >= 8 {
			summary = append(summary, map[string]any{"truncated": true})
			break
		}

		message, ok := item.(map[string]any)
		if !ok {
			summary = append(summary, map[string]any{"value": sanitizeValue(item)})
			continue
		}

		entry := map[string]any{
			"role": message["role"],
		}
		if content, exists := message["content"]; exists {
			entry["content_preview"] = summarizeContent(content)
		}
		summary = append(summary, entry)
	}

	return summary
}

func summarizeInput(value any) any {
	items, ok := value.([]any)
	if !ok {
		return sanitizeValue(value)
	}

	summary := make([]any, 0, len(items))
	for index, item := range items {
		if index >= 8 {
			summary = append(summary, map[string]any{"truncated": true})
			break
		}
		summary = append(summary, summarizeContent(item))
	}
	return summary
}

func summarizeContent(value any) any {
	switch typed := value.(type) {
	case string:
		return truncateString(typed, 400)
	case []any:
		result := make([]any, 0, len(typed))
		for index, item := range typed {
			if index >= 8 {
				result = append(result, map[string]any{"truncated": true})
				break
			}

			itemMap, ok := item.(map[string]any)
			if !ok {
				result = append(result, sanitizeValue(item))
				continue
			}

			entry := map[string]any{
				"type": itemMap["type"],
			}
			if text, ok := itemMap["text"].(string); ok {
				entry["text_preview"] = truncateString(text, 300)
			}
			if imageURL, ok := itemMap["image_url"]; ok {
				entry["image_url"] = sanitizeValue(imageURL)
			}
			result = append(result, entry)
		}
		return result
	case map[string]any:
		return sanitizePayload(typed)
	default:
		return sanitizeValue(value)
	}
}

func truncateString(value string, limit int) string {
	value = strings.TrimSpace(value)
	if limit <= 0 || len(value) <= limit {
		return value
	}
	return value[:limit] + "...[truncated]"
}

func mergeMetadata(base map[string]any, extra map[string]any) map[string]any {
	result := make(map[string]any, len(base)+len(extra))
	for key, value := range base {
		result[key] = value
	}
	for key, value := range extra {
		result[key] = value
	}
	return result
}

func buildRequestID() string {
	return time.Now().UTC().Format("20060102T150405.000000000")
}
