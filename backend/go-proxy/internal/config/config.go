package config

import (
	"os"
	"strings"
)

type Config struct {
	Host               string
	Port               string
	SupabaseURL        string
	SupabaseServiceKey string
	GatewayAPIKeys     []string
}

func Load() Config {
	host := os.Getenv("GO_PROXY_HOST")
	if host == "" {
		host = "0.0.0.0"
	}

	port := os.Getenv("GO_PROXY_PORT")
	if port == "" {
		port = "8081"
	}

	return Config{
		Host:               host,
		Port:               port,
		SupabaseURL:        os.Getenv("SUPABASE_URL"),
		SupabaseServiceKey: os.Getenv("SUPABASE_SERVICE_ROLE_KEY"),
		GatewayAPIKeys:     loadGatewayAPIKeys(),
	}
}

func (c Config) Address() string {
	return c.Host + ":" + c.Port
}

func loadGatewayAPIKeys() []string {
	rawValues := []string{
		os.Getenv("GATEWAY_API_KEYS"),
		os.Getenv("GATEWAY_ACCESS_KEYS"),
	}

	keys := make([]string, 0, 4)
	seen := make(map[string]struct{})

	for _, raw := range rawValues {
		if strings.TrimSpace(raw) == "" {
			continue
		}

		parts := strings.FieldsFunc(raw, func(r rune) bool {
			return r == ',' || r == '\n' || r == '\r'
		})

		for _, part := range parts {
			key := strings.TrimSpace(part)
			if !strings.HasPrefix(key, "sk-") {
				continue
			}
			if _, exists := seen[key]; exists {
				continue
			}
			seen[key] = struct{}{}
			keys = append(keys, key)
		}
	}

	return keys
}
