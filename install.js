// this script create a systemd file and copy it to your /etc/systemd/system folder

const fs = require('fs')
const path = require('path')

const nodePath = process.execPath

const file = `# Installation Time: ${new Date().toUTCString()}

[Unit]
Description=Node Proxy Server

[Service]
ExecStart=${nodePath} ${path.join(__dirname, 'src/server.js')}
Restart=always
Environment=NODE_ENV=production
WorkingDirectory=${__dirname}

[Install]
WantedBy=multi-user.target
`

fs.writeFile('/etc/systemd/system/proxy-server.service', file, (err) => {
    if (err) {
        console.error(`Installation Failed. ${err}`)
    } else {
        console.log('Installation Success')
    }
})
