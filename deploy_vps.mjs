import { NodeSSH } from 'node-ssh';
import path from 'path';

const ssh = new NodeSSH();

async function deploy() {
  console.log('Connecting to VPS: 95.111.225.90...');
  
  try {
    await ssh.connect({
      host: '95.111.225.90',
      username: 'root',
      password: 'by541600'
    });
    console.log('Connected!');

    const remotePath = '/var/www/pimaxer.in';

    // 1. Prepare directory
    console.log('Preparing directories...');
    await ssh.execCommand(`mkdir -p ${remotePath}`);

    // 2. Upload archive
    console.log('Uploading deploy.zip...');
    await ssh.putFile('deploy.zip', `${remotePath}/deploy.zip`);

    // 3. Extract and Clean
    console.log('Extracting archive...');
    await ssh.execCommand('src server public index.html package.json vite.config.ts tsconfig.json tailwind.config.js postcss.config.js eslint.config.js'.split(' ').map(f => `rm -rf ${remotePath}/${f}`).join(' && '));
    await ssh.execCommand(`apt-get update && apt-get install -y unzip`);
    await ssh.execCommand(`unzip -o deploy.zip`, { cwd: remotePath });
    await ssh.execCommand(`rm deploy.zip`, { cwd: remotePath });

    // 4. Install & Build
    console.log('Running npm install & build (this may take a minute)...');
    // Using a login shell to ensure node/npm are in PATH if using NVM
    const buildCmd = `export PATH=$PATH:/usr/local/bin && npm install && npm run build`;
    const buildRes = await ssh.execCommand(buildCmd, { cwd: remotePath });
    console.log('Build Output:', buildRes.stdout || buildRes.stderr);

    // 5. PM2 Setup
    console.log('Setting up PM2...');
    await ssh.execCommand('npm install -g pm2');
    await ssh.execCommand('pm2 delete pimaxer-backend || true');
    await ssh.execCommand('pm2 start server/index.mjs --name "pimaxer-backend"', { cwd: remotePath });
    await ssh.execCommand('pm2 save');

    // 6. Nginx Config
    console.log('Configuring Nginx...');
    const nginxConfig = `
server {
    listen 80;
    server_name pimaxer.in www.pimaxer.in;

    root ${remotePath}/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5174;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /stream/ {
        proxy_pass http://127.0.0.1:5174;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_buffering off;
        proxy_read_timeout 86400;
    }
}
`;
    const tempNginxFile = '/tmp/pimaxer.in.conf';
    await ssh.execCommand(`echo '${nginxConfig.replace(/'/g, "'\\''")}' > ${tempNginxFile}`);
    await ssh.execCommand(`mv ${tempNginxFile} /etc/nginx/sites-available/pimaxer.in`);
    await ssh.execCommand(`ln -s /etc/nginx/sites-available/pimaxer.in /etc/nginx/sites-enabled/ || true`);
    
    console.log('Restarting Nginx...');
    await ssh.execCommand('nginx -t && systemctl restart nginx');

    console.log('Deployment SUCCESSFUL!');
    console.log('URL: http://pimaxer.in');

  } catch (err) {
    console.error('Deployment FAILED:', err);
  } finally {
    ssh.dispose();
  }
}

deploy();
