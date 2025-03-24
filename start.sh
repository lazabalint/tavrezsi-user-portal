#!/bin/sh
# Make sure the Vite bundle is built
npm run build
# Run with the production wrapper that handles node-mailjet issues
NODE_ENV=production node productionWrapper.js