.PHONY: build build-backend build-web run run-backend run-web stop stop-backend stop-web logs-backend logs-web index

# Configuration
BACKEND_ADDR    ?= localhost:9999
WEB_ADDR        ?= 127.0.0.1:8910
INDEX_CONFIG    ?= doc/examples/livegrep/index.json
SERVER_CONFIG   ?= doc/examples/livegrep/server.json
DOCROOT          = $(shell pwd)/bazel-bin/cmd/livegrep/livegrep_/livegrep.runfiles/_main/web

CODESEARCH_BIN   = bazel-bin/src/tools/codesearch
LIVEGREP_BIN     = bazel-bin/cmd/livegrep/livegrep_/livegrep

BACKEND_PID_FILE = /tmp/livegrep-backend.pid
WEB_PID_FILE     = /tmp/livegrep-web.pid
BACKEND_LOG      = /tmp/livegrep-backend.log
WEB_LOG          = /tmp/livegrep-web.log

# Build targets
build: ## Build both backend and web frontend
	bazel build //src/tools:codesearch //cmd/livegrep:livegrep

build-backend: ## Build only the codesearch backend
	bazel build //src/tools:codesearch

build-web: ## Build only the web frontend
	bazel build //cmd/livegrep:livegrep

# Run targets
run: build stop run-backend run-web ## Build and run everything
	@echo "Livegrep is running at http://$(WEB_ADDR)"

run-backend: build-backend stop-backend ## Start the codesearch backend
	$(CODESEARCH_BIN) -grpc $(BACKEND_ADDR) $(INDEX_CONFIG) > $(BACKEND_LOG) 2>&1 & echo $$! > $(BACKEND_PID_FILE)
	@sleep 2
	@if kill -0 $$(cat $(BACKEND_PID_FILE)) 2>/dev/null; then \
		echo "Backend running (PID $$(cat $(BACKEND_PID_FILE))) on $(BACKEND_ADDR)"; \
	else \
		echo "Backend failed to start. Logs:"; cat $(BACKEND_LOG); exit 1; \
	fi

run-web: build stop-web ## Start the web frontend (with template reload)
	$(LIVEGREP_BIN) -docroot $(DOCROOT) -reload $(SERVER_CONFIG) > $(WEB_LOG) 2>&1 & echo $$! > $(WEB_PID_FILE)
	@sleep 2
	@if kill -0 $$(cat $(WEB_PID_FILE)) 2>/dev/null; then \
		echo "Web frontend running (PID $$(cat $(WEB_PID_FILE))) on http://$(WEB_ADDR)"; \
	else \
		echo "Web frontend failed to start. Logs:"; cat $(WEB_LOG); exit 1; \
	fi

# Stop targets
stop: stop-web stop-backend ## Stop all services

stop-backend: ## Stop the codesearch backend
	@if [ -f $(BACKEND_PID_FILE) ] && kill -0 $$(cat $(BACKEND_PID_FILE)) 2>/dev/null; then \
		kill $$(cat $(BACKEND_PID_FILE)) && rm -f $(BACKEND_PID_FILE) && echo "Backend stopped"; \
	else \
		rm -f $(BACKEND_PID_FILE); \
	fi

stop-web: ## Stop the web frontend
	@if [ -f $(WEB_PID_FILE) ] && kill -0 $$(cat $(WEB_PID_FILE)) 2>/dev/null; then \
		kill $$(cat $(WEB_PID_FILE)) && rm -f $(WEB_PID_FILE) && echo "Web frontend stopped"; \
	else \
		rm -f $(WEB_PID_FILE); \
	fi

# Utility targets
logs-backend: ## Tail the backend logs
	tail -f $(BACKEND_LOG)

logs-web: ## Tail the web frontend logs
	tail -f $(WEB_LOG)

status: ## Check if services are running
	@echo "Backend:"; \
	if [ -f $(BACKEND_PID_FILE) ] && kill -0 $$(cat $(BACKEND_PID_FILE)) 2>/dev/null; then \
		echo "  Running (PID $$(cat $(BACKEND_PID_FILE)))"; \
	else \
		echo "  Stopped"; \
	fi
	@echo "Web frontend:"; \
	if [ -f $(WEB_PID_FILE) ] && kill -0 $$(cat $(WEB_PID_FILE)) 2>/dev/null; then \
		echo "  Running (PID $$(cat $(WEB_PID_FILE)))"; \
	else \
		echo "  Stopped"; \
	fi

index: build-backend ## Build an index file (use INDEX_OUTPUT to set path)
	$(CODESEARCH_BIN) -index_only -dump_index $(or $(INDEX_OUTPUT),livegrep.idx) $(INDEX_CONFIG)

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-16s\033[0m %s\n", $$1, $$2}'
