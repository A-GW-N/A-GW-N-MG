package main

import (
	"log"

	"agwn-go-proxy/internal/config"
	"agwn-go-proxy/internal/server"
	"agwn-go-proxy/internal/store"
)

func main() {
	cfg := config.Load()

	pgStore, err := store.NewPostgrestStore(cfg.SupabaseURL, cfg.SupabaseServiceKey)
	if err != nil {
		log.Fatalf("failed to initialize store: %v", err)
	}
	defer pgStore.Close()

	srv := server.New(cfg, pgStore)
	log.Printf("agwn go proxy listening on %s", cfg.Address())
	if err := srv.ListenAndServe(); err != nil {
		log.Fatalf("server stopped: %v", err)
	}
}
