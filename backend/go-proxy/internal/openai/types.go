package openai

type ChatCompletionRequest struct {
	Model       string           `json:"model"`
	Messages    any              `json:"messages,omitempty"`
	Input       any              `json:"input,omitempty"`
	Tools       []map[string]any `json:"tools,omitempty"`
	MaxTokens   any              `json:"max_tokens,omitempty"`
	Temperature any              `json:"temperature,omitempty"`
	Metadata    map[string]any   `json:"metadata,omitempty"`
	Extra       map[string]any   `json:"-"`
}

type GatewayProfile struct {
	ID               string
	ProfileKey       string
	DisplayName      string
	ProviderSlug     string
	EndpointURL      string
	AuthMode         string
	AuthToken        string
	RequestMode      string
	ModelMappings    map[string]string
	BrandMappings    map[string]string
	DefaultHeaders   map[string]string
	ExtraPayload     map[string]any
	PoolTablePattern string
	IsEnabled        bool
}

type AccountPool struct {
	PoolKey     string
	TableName   string
	DisplayName string
	Brand       string
	Metadata    map[string]any
	IsEnabled   bool
}

type GatewayAPIKey struct {
	ID          string
	KeyName     string
	KeyPrefix   string
	SecretHash  string
	OwnerUserID string
	IsEnabled   bool
}

type RequestLog struct {
	RequestID           string
	ProfileID           string
	GatewayAPIKeyID     string
	GatewayAPIKeyName   string
	GatewayAPIKeyPrefix string
	UserID              string
	ExternalModel       string
	MappedModel         string
	Brand               string
	RequestMode         string
	Success             bool
	StatusCode          int
	LatencyMS           int
	InputTokens         int
	OutputTokens        int
	TotalTokens         int
	RPMCount            int
	TPMCount            int
	PoolTableName       string
	PoolRecordID        string
	ToolCount           int
	ImageCount          int
	ErrorMessage        string
	Metadata            map[string]any
}
