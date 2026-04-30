package server

import (
	"log"
	"net/http"

	"agwn-go-proxy/internal/config"
	"agwn-go-proxy/internal/store"
)

type Server struct {
	httpServer     *http.Server
	store          *store.PostgresStore
	gatewayAPIKeys []string
}

func New(cfg config.Config, pgStore *store.PostgresStore) *Server {
	mux := http.NewServeMux()
	srv := &Server{
		store:          pgStore,
		gatewayAPIKeys: cfg.GatewayAPIKeys,
	}

	mux.HandleFunc("/healthz", srv.handleHealth)
	mux.HandleFunc("/v1/chat/completions", srv.handleChatCompletions)
	mux.HandleFunc("/v1/messages", srv.handleMessages)
	mux.HandleFunc("/v1/models", srv.handleModels)

	return &Server{
		httpServer: &http.Server{
			Addr:    cfg.Address(),
			Handler: requestLogger(mux),
		},
		store: pgStore,
	}
}

func (s *Server) ListenAndServe() error {
	return s.httpServer.ListenAndServe()
}

func requestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("%s %s", r.Method, r.URL.Path)
		next.ServeHTTP(w, r)
	})
}
