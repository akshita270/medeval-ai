#!/bin/bash
# Rebuilds the vector index from the committed raw documents after every
# deploy. data/chroma_db is gitignored (it's a derived artifact, not
# source), so the running instance has to build it itself -- same as the
# CI pipeline does in .github/workflows/release.yml.
set -e

source /var/app/venv/*/bin/activate
source /opt/elasticbeanstalk/support/envvars

cd /var/app/current
python -m scripts.build_index
