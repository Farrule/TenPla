FROM mcr.microsoft.com/devcontainers/base:bookworm

# PDF解析・画像処理・ビルドツール・Tauri依存ライブラリのインストール
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get install -y --no-install-recommends \
        python3 \
        python3-pip \
        python3-venv \
        python3-dev \
        build-essential \
        curl \
        git \
        poppler-utils \
        libgl1 \
        libglib2.0-0 \
        pkg-config \
        libssl-dev \
        libgtk-3-dev \
        libwebkit2gtk-4.1-dev \
        libayatana-appindicator3-dev \
        librsvg2-dev \
        tesseract-ocr \
        tesseract-ocr-jpn \
        tesseract-ocr-jpn-vert \
        fonts-noto-cjk \
        fonts-ipafont \
        psmisc \
        lsof \
        procps \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
    && fc-cache -fv


# 将来のTauri化を見据えてvscodeユーザーにRustをセットアップ
USER vscode
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/home/vscode/.cargo/bin:${PATH}"