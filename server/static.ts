import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { log } from "./vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Proper implementation of serveStatic to serve the built client files
 * in production mode. This function should be used instead of the one
 * in vite.ts which has an incorrect path.
 */
export function serveProductionStatic(app: Express) {
  // The correct path for the production build based on vite.config.ts
  // Vite builds the client into the dist/public folder as specified in the config
  const distPath = path.resolve(__dirname, "..", "dist", "public");
  
  // Check if the build directory exists
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first with 'npm run build'`
    );
  }
  
  // Serve static files from the build directory
  app.use(express.static(distPath));
  
  // For SPAs, serve index.html for any path that doesn't match a static file
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
  
  log("Serving static files from " + distPath, "express");
}