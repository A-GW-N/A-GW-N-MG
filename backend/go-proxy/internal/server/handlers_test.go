package server

import (
	"testing"

	"agwn-go-proxy/internal/openai"
)

func TestSelectProfileForRequestMatchesSecondProfileModelMapping(t *testing.T) {
	profiles := []openai.GatewayProfile{
		{
			ID:            "first",
			ModelMappings: map[string]string{"gpt-first": "upstream-first"},
		},
		{
			ID:            "second",
			ModelMappings: map[string]string{"gpt-second": "upstream-second"},
		},
	}

	profile := selectProfileForRequest(profiles, "gpt-second")
	if profile == nil {
		t.Fatal("expected selected profile, got nil")
	}
	if profile.ID != "second" {
		t.Fatalf("expected second profile, got %q", profile.ID)
	}
}

func TestSelectProfileForRequestFallsBackToFirstProfile(t *testing.T) {
	profiles := []openai.GatewayProfile{
		{
			ID:            "first",
			ModelMappings: map[string]string{"gpt-first": "upstream-first"},
		},
		{
			ID:            "second",
			ModelMappings: map[string]string{"gpt-second": "upstream-second"},
		},
	}

	profile := selectProfileForRequest(profiles, "unknown-model")
	if profile == nil {
		t.Fatal("expected selected profile, got nil")
	}
	if profile.ID != "first" {
		t.Fatalf("expected first profile fallback, got %q", profile.ID)
	}
}

func TestRequestModelFromBody(t *testing.T) {
	model := requestModelFromBody([]byte(`{"model":"gpt-second","messages":[]}`))
	if model != "gpt-second" {
		t.Fatalf("expected request model gpt-second, got %q", model)
	}
}
