#!/bin/bash
# This is a read-only showcase deploy (recruiters view existing results, they
# don't run new evaluations), so drop packages the live site never needs:
# dev-only tooling (pytest/ruff/mypy) and sentence-transformers (pulls in
# torch + transformers, ~700MB) which only the optional reranker imports, and
# only when USE_RERANKING is explicitly turned on (it's off by default).
# Skipping these keeps the install light enough for t3.micro's CPU credits.
set -e

cd /var/app/staging
sed -i '/^sentence-transformers==/d;/^pytest==/d;/^ruff==/d;/^mypy==/d' requirements.txt
