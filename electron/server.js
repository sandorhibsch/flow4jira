const { createServer } = require('http');
const { parse } = require('url');
const path = require('path');

// Ensure we can resolve modules from project root
const projectRoot = path.join(__dirname, '..');

// Resolve 'next' module from project root
// This handles cases where Electron's module resolution doesn't find node_modules
let next;
try {
  // Try normal require first
  next = require('next');
} catch (err) {
  if (err.code === 'MODULE_NOT_FOUND') {
    // If that fails, explicitly resolve from project root
    const nextPath = require.resolve('next', { 
      paths: [projectRoot]
    });
    next = require(nextPath);
  } else {
    throw err;
  }
}

function startNextServer(port = 3000) {
  // Point to the .next directory in production
  const app = next({
    dev: false,
    hostname: 'localhost',
    port,
    dir: path.join(__dirname, '..')
  });

  const handle = app.getRequestHandler();

  return app.prepare().then(() => {
    const server = createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error occurred handling', req.url, err);
        res.statusCode = 500;
        res.end('internal server error');
      }
    });

    return new Promise((resolve, reject) => {
      server.listen(port, (err) => {
        if (err) reject(err);
        console.log(`> Next.js server ready on http://localhost:${port}`);
        resolve(server);
      });
    });
  });
}

module.exports = { startNextServer };
