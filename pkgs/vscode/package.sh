#!/usr/bin/env bash

cd ../web || exit 1
npm run build
cd ../vscode || exit 1
vsce package --no-dependencies
