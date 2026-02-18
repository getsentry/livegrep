# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is This?

Livegrep is a tool for interactive regex search of large source repositories, inspired by Google Code Search. This is Sentry's fork of [livegrep/livegrep](https://github.com/livegrep/livegrep).

Two-process architecture:
- **codesearch** (C++): Builds index from git repos/filesystem, serves search over gRPC (port 9999)
- **livegrep** (Go): Stateless HTTP frontend connecting to codesearch, serves web UI (port 8910)

The web UI uses Backbone.js/jQuery with PrismJS for syntax highlighting, bundled via webpack.

## Build System

Uses **Bazel** (v7.6.0 pinned in `.bazelversion`). Install via [bazelisk](https://bazel.build/install/bazelisk).

```bash
# Build everything
bazel build //...

# Build specific targets
bazel build //src/tools:codesearch    # C++ backend
bazel build //cmd/livegrep:livegrep   # Go frontend
```

A convenience Makefile wraps common workflows:

```bash
make build       # Build both backend and frontend
make index       # Build search index (uses doc/examples/livegrep/index.json)
make run         # Build and start both services
make stop        # Stop all services
make status      # Check if services are running
make logs-backend / make logs-web
```

## Testing

```bash
bazel test //...                       # Run all tests
bazel test --test_arg=-test.v //...    # Verbose (used in CI)
```

- C++ tests: `test/` directory (googletest) — `codesearch_test`, `planner_test`, `tagsearch_test`
- Go tests: `server/` directory — `query_test.go`, `server_test.go`, `fileview_test.go`

## Formatting

Go code must pass `gofmt`. CI checks this:
```bash
bazel run @rules_go//go -- fmt ./...
```

## Key Directories

| Directory | Language | Role |
|-----------|----------|------|
| `src/` | C++ | Search engine core, indexer, gRPC server |
| `src/proto/` | Protobuf | gRPC service + index config schemas |
| `server/` | Go | HTTP frontend, gRPC client, templates |
| `cmd/` | Go | Binary entrypoints (livegrep, reindexers, CLI) |
| `web/` | JS/HTML/CSS | Frontend UI (webpack, Backbone.js, PrismJS) |
| `third_party/` | C++ | Vendored deps (divsufsort, utf8cpp) |

## Configuration

- **Index config** (codesearch): JSON following `src/proto/config.proto` schema. Example: `doc/examples/livegrep/index.json`
- **Server config** (livegrep frontend): JSON following `server/config/config.go`. Example: `doc/examples/livegrep/server.json`
  - `file_ext_to_lang`: Maps file extensions to PrismJS language names for syntax highlighting
  - `file_first_line_regex_to_lang`: Detects language by shebang/first line

## Sentry Fork Additions

- **Test file deranking**: Results from test files are sorted to the end of search results (`server/api.go:isTestFile`)
- **Syntax highlighting**: PrismJS-based highlighting in search results (`web/src/codesearch/highlight.js`)
- **Healthcheck age limit**: Backend healthcheck fails if index > 3.5 hours old (`server/server.go:MaxIndexAge`)

## Go + Bazel Notes

- Go IDE support requires the gopackagesdriver (configured in `.vscode/settings.json` for VSCode)
- Go module path: `github.com/livegrep/livegrep`
- Protobuf Go bindings are at `src/proto/go_proto`
- To update Go deps: edit `go.mod`, then regenerate Bazel targets with gazelle
