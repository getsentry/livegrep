# Build stage — compile everything with Bazel
FROM ubuntu:24.04 AS builder

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
    build-essential \
    git \
    openjdk-21-jdk-headless \
    python3 \
    curl \
    zip \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Bazelisk (manages Bazel version via .bazelversion)
RUN curl -L https://github.com/bazelbuild/bazelisk/releases/download/v1.25.0/bazelisk-linux-amd64 \
    -o /usr/local/bin/bazel && chmod +x /usr/local/bin/bazel

RUN useradd -m builder
WORKDIR /src
COPY --chown=builder . .

# Use CI bazelrc for optimized builds
RUN cp .bazelrc.ci .bazelrc

USER builder
RUN bazel build :livegrep \
    && mkdir -p /output \
    && tar -C /output -xf "$(bazel info bazel-bin)/livegrep.tar"

# Runtime stage
FROM ubuntu:24.04

RUN apt-get update \
    && apt-get -y dist-upgrade \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y \
        git \
        openssh-client \
        ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /output/ /livegrep/
