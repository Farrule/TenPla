FROM mcr.microsoft.com/devcontainers/base:bookworm

# PDF解析・画像処理・ビルドツール・Tauri依存ライブラリ・ageのインストール
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
        age \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && fc-cache -fv

# SOPS バイナリのインストール
ARG SOPS_VERSION="v3.13.3"
RUN curl -LO "https://github.com/getsops/sops/releases/download/${SOPS_VERSION}/sops-${SOPS_VERSION}.linux.amd64" \
    && mv "sops-${SOPS_VERSION}.linux.amd64" /usr/local/bin/sops \
    && chmod +x /usr/local/bin/sops

USER vscode
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/home/vscode/.cargo/bin:${PATH}"

# SOPS / age 鍵用ディレクトリの作成と環境変数定義
ENV SOPS_AGE_KEY_FILE="/home/vscode/.config/sops/age/keys.txt"
RUN mkdir -p /home/vscode/.config/sops/age

# バックエンド仮想環境の作成と依存関係のインストール
RUN python3 -m venv /home/vscode/.venv \
    && /home/vscode/.venv/bin/pip install --no-cache-dir --upgrade pip \
    && /home/vscode/.venv/bin/pip install --no-cache-dir \
        reportlab \
        pdfplumber \
        openpyxl \
        fastapi \
        "uvicorn[standard]" \
        python-multipart \
        pydantic