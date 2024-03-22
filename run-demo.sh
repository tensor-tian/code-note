#! /bin/bash

set -o xtrace
set -e


yarn workspace @code-hike-local/lighter build
yarn workspace @code-hike-local/mdx build
yarn workspace demo-next dev


