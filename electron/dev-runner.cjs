const { spawn } = require('child_process');
const net = require('net');

// Determine the npm executable command depending on the OS (npm.cmd on Windows)
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

console.log('[Dev Runner] Starting Vite dev server...');
// Spawn the Vite dev server
const vite = spawn(npmCmd, ['run', 'dev'], {
  stdio: 'inherit',
  shell: true
});

// Function to check if a local port is open/listening (checks both IPv4 and IPv6)
function checkPort(port, callback) {
  const socket = new net.Socket();
  socket.setTimeout(150);

  socket.on('connect', () => {
    socket.destroy();
    callback(true);
  });

  socket.on('timeout', () => {
    socket.destroy();
    callback(false);
  });

  socket.on('error', () => {
    socket.destroy();
    
    // Fallback to IPv6 loopback (::1) because on Windows/Node 17+,
    // Vite often binds to IPv6 by default.
    const ipv6Socket = new net.Socket();
    ipv6Socket.setTimeout(150);
    
    ipv6Socket.on('connect', () => {
      ipv6Socket.destroy();
      callback(true);
    });
    ipv6Socket.on('error', () => {
      ipv6Socket.destroy();
      callback(false);
    });
    ipv6Socket.on('timeout', () => {
      ipv6Socket.destroy();
      callback(false);
    });
    
    ipv6Socket.connect(port, '::1');
  });

  socket.connect(port, '127.0.0.1');
}

// Poll the port until Vite is ready, then launch Electron
const port = 5173;
const checkInterval = setInterval(() => {
  checkPort(port, (isOpen) => {
    if (isOpen) {
      clearInterval(checkInterval);
      console.log(`\n[Dev Runner] Vite dev server is ready on port ${port}. Launching Electron...`);

      const electron = spawn(npmCmd, ['run', 'electron:dev'], {
        stdio: 'inherit',
        shell: true
      });

      // When Electron window is closed, cleanly shut down the Vite process as well
      electron.on('close', (code) => {
        console.log(`\n[Dev Runner] Electron exited with code ${code}. Stopping Vite dev server...`);
        vite.kill();
        process.exit(code);
      });
    }
  });
}, 200);

// Gracefully handle terminating the runner process directly
const handleExit = () => {
  vite.kill();
  process.exit();
};
process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);
