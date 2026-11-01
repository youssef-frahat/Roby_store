import fs from 'node:fs';
import path from 'node:path';

// Patch fs.promises.writeFile to automatically create directories if missing (fixes Next.js pure App Router _ssgManifest ENOENT on Windows)
const origWriteFile = fs.promises.writeFile.bind(fs.promises);
fs.promises.writeFile = async (file, data, options) => {
  try {
    return await origWriteFile(file, data, options);
  } catch (err) {
    if (err && err.code === 'ENOENT' && typeof file === 'string') {
      const dir = path.dirname(file);
      fs.mkdirSync(dir, { recursive: true });
      return await origWriteFile(file, data, options);
    }
    throw err;
  }
};

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  experimental: {
    webpackBuildWorker: false,
  },
  webpack: (config) => {
    config.plugins.push({
      apply(compiler) {
        compiler.hooks.afterEnvironment.tap('WindowsMkdirEpermFixPlugin', () => {
          const ofs = compiler.outputFileSystem;
          if (ofs && ofs.mkdir) {
            const originalMkdir = ofs.mkdir.bind(ofs);
            ofs.mkdir = (dirPath, ...args) => {
              const cb = args.pop();
              originalMkdir(dirPath, ...args, (err, ...res) => {
                if (err) {
                  if (err.code === 'EEXIST' || (err.code === 'EPERM' && fs.existsSync(dirPath))) {
                    return cb(null, ...res);
                  }
                  if (err.code === 'EPERM') {
                    try {
                      fs.mkdirSync(dirPath, { recursive: true });
                      return cb(null, ...res);
                    } catch (syncErr) {
                      if (syncErr.code === 'EEXIST' || fs.existsSync(dirPath)) {
                        return cb(null, ...res);
                      }
                    }
                  }
                }
                return cb(err, ...res);
              });
            };
          }
        });
      },
    });
    return config;
  },
};

export default nextConfig;


