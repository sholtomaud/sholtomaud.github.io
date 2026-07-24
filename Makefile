IMAGE_APP        := sholtomaud.github.io
CONTAINER_BIN    := container
NODE_VERSION     := $(shell cat .node-version)
WORKDIR          := /app

.PHONY: start image install dev build-app typecheck test-unit test test-ci ci clean

# --------------------------------------------------
# Container daemon
# --------------------------------------------------

start: ## Start the Apple container system daemon
	$(CONTAINER_BIN) system start

# --------------------------------------------------
# Container image
# --------------------------------------------------

image: start ## Build dev container image (node:$(NODE_VERSION)-slim)
	$(CONTAINER_BIN) build -f Containerfile -t $(IMAGE_APP) --build-arg NODE_VERSION=$(NODE_VERSION) .

# --------------------------------------------------
# Compilation and serving targets
# --------------------------------------------------

install: start ## Run package installation inside container
	$(CONTAINER_BIN) run --rm -v $(shell pwd):$(WORKDIR) $(IMAGE_APP) npm install

dev: start ## Start Vite dev server inside container (also watches content/*.md live, see vite.config.ts)
	$(CONTAINER_BIN) run --rm -it -p 5173:5173 -v $(shell pwd):$(WORKDIR) --name boba-dev $(IMAGE_APP) npm run dev

build-app: start ## Compile optimized static assets (Vite)
	$(CONTAINER_BIN) run --rm -v $(shell pwd):$(WORKDIR) $(IMAGE_APP) npm run build

typecheck: start ## Type-check with tsgo (TypeScript native-preview)
	$(CONTAINER_BIN) run --rm -v $(shell pwd):$(WORKDIR) $(IMAGE_APP) npm run typecheck

test-unit: start ## Run node --test unit tests inside container
	$(CONTAINER_BIN) run --rm -v $(shell pwd):$(WORKDIR) $(IMAGE_APP) npm test

test: start install ## Run Playwright E2E integration tests inside container
	$(CONTAINER_BIN) run --rm -it -p 5173:5173 -p 3000:3000 -v $(shell pwd):$(WORKDIR) $(IMAGE_APP) npm run e2e

test-ci: start install ## Run Playwright E2E tests non-interactively (no TTY required — scripts/automation)
	$(CONTAINER_BIN) run --rm -p 5173:5173 -p 3000:3000 -v $(shell pwd):$(WORKDIR) $(IMAGE_APP) npm run e2e

# --------------------------------------------------
# Full CI pipeline (local mirror of GitHub Actions)
# --------------------------------------------------

ci: start install typecheck build-app test-unit test-ci ## Run the full CI pipeline locally, in the same order as .github/workflows/ci.yml (`gh act` can't be used here — it needs a Docker API socket, which the Apple `container` CLI doesn't expose)

clean: ## Clear compiled directories and node dependencies
	rm -rf node_modules dist .vite