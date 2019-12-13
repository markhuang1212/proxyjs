const http = require('http')
const https = require('https')
const net = require('net')
const url = require('url')
const fs = require('fs')
const path = require('path')

const CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json')))
const VERSION = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'))).version

// CONFIG START
const hostname = CONFIG.host
const remotePort = CONFIG.remotePort
const key = fs.readFileSync(CONFIG.serverSSL.key)
const cert = fs.readFileSync(CONFIG.serverSSL.cert)
const ca = fs.readFileSync(CONFIG.clientSSL.cert)

// CONFIG END

const indexHTML = fs.readFileSync(path.join(__dirname, '../host/index.html'), 'utf8')
const errorHTML = fs.readFileSync(path.join(__dirname, '../host/error.html'), 'utf8')
const mainJS = fs.readFileSync(path.join(__dirname, '../host/main.js'), 'utf8')

// const user = app_config.username
// const psd = app_config.password


const ciphers = [
    'TLS_AES_128_GCM_SHA256',
    'TLS_CHACHA20_POLY1305_SHA256',
    'TLS_AES_256_GCM_SHA384',
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-ECDSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-ECDSA-AES256-GCM-SHA384',
    'DHE-RSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES128-SHA256',
    'DHE-RSA-AES128-SHA256',
    'ECDHE-RSA-AES256-SHA384',
    'DHE-RSA-AES256-SHA384',
    'ECDHE-RSA-AES256-SHA256',
    'DHE-RSA-AES256-SHA256',
].join(':')

const server = https.createServer({
    key,
    cert,
    ciphers,
    requestCert: true,
    rejectUnauthorized: false,
    ca: [ca]
}, (req, res) => {
    if (req.headers.host.split(':')[0] != hostname || req.url == '/error.html') {
        // if(false){
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(errorHTML.replace('$COMMONNAME', req.socket.getPeerCertificate().subject.CN).replace('$VERSION', VERSION))
    }
    else if (req.url == '/memoryinfo') {
        res.writeHead(200, { 'Content-Type': 'text/json' })
        res.end(JSON.stringify(process.memoryUsage(), null, '  '))
    }
    else if (req.url == '/reset') {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('reset success')
        process.exit(1)
    }
    else if (req.url == '/' || req.url == '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(indexHTML.replace('$VERSION', VERSION))
    }
    else if (req.url == '/main.js') {
        res.writeHead(200, { 'Content-Type': 'text/javascript' })
        res.end(mainJS)
    }
    else {
        res.writeHead(404, { 'Content-Type': 'text/html' })
        res.end('<h1>404 Page Not Found</h1>')
    }
})

server.on('connect', (req, cltSocket, head) => {
    console.log(req.url)

    if (!req.socket.authorized) {
        console.log('unauthorized')
        return ''
    }

    if (req.url.match('pornhub.com')) {
        cltSocket.write('HTTP/1.1 302 Connection Established\r\n' +
            'Location: https://ali.ada00ada.com/error.html' + '\r\n' + '\r\n')
    }

    // authorization

    // if (!req.headers['proxy-authorization']) {
    //     cltSocket.write('HTTP/1.1 407 Proxy Authentication Required\r\n' +
    //         'Proxy-Authenticate: Basic realm=\"Access to internal site\"\r\n' + '\r\n')
    //     cltSocket.end()
    //     return
    // }

    // try {
    //     const credential = req.headers['proxy-authorization'].split(' ')[1]
    //     const [cre_user, cre_psd] = new Buffer.from(credential, 'base64').toString('utf8').split(':')

    //     if (cre_user != user || cre_psd != psd) {
    //         cltSocket.write('HTTP/1.1 407 Proxy Authentication Required\r\n' +
    //             'Proxy-Authenticate: Basic realm=\"Access to internal site\"\r\n' + '\r\n')
    //         cltSocket.end()
    //         return
    //     }
    // } catch (e) {
    //     cltSocket.end()
    //     return 1
    // }

    const { port, hostname } = url.parse(`http://${req.url}`)

    const srvSocket = net.connect(port, hostname, () => {
        cltSocket.write('HTTP/1.1 200 Connection Established\r\n' +
            'Proxy-agent: Node.js-Proxy\r\n' +
            '\r\n')
        srvSocket.write(head)
        srvSocket.pipe(cltSocket)
        cltSocket.pipe(srvSocket)
    })

    cltSocket.setTimeout(120000)
    cltSocket.on('timeout', () => {
        console.log('client socket timeout')
        cltSocket.destroy()
    })

    srvSocket.setTimeout(120000)
    srvSocket.on('timeout', () => {
        console.log('server socket timeout')
        srvSocket.destroy()
    })

    srvSocket.on('error', err => {
        console.error(`server socket error: ${err.message}`)
        if (typeof cltSocket !== 'undefined') {
            // cltSocket.end(`HTTP/1.1 500 ${err.message}\r\n`)
            cltSocket.destroy()
        }
    })

    cltSocket.on('error', err => {
        console.error(`client socket error: ${err.message}`)
        if (typeof srvSocket !== 'undefined') {
            srcSocket.destroy()
        }
    })
})

server.on('error', err => {
    console.error(`web server error: ${err.message}`)
})

server.listen(remotePort, '::', () => {
    console.log(`proxy listening at port ${remotePort}`)
})


http.createServer((req, res) => {
    console.log(req.url)
    res.writeHead(302, { 'Location': `https://${hostname}:${remotePort}${req.url}` })
    res.end()
}).listen(80, '::')

process.on('uncaughtException', function (exception) {
    console.error(`uncaught error: ${exception.message}`)
});

if (global.gc) {
    setInterval(() => {
        global.gc()
    }, 15000)
}

// cron.schedule('0 0 4 * * *', () => {
//     process.exit(1)
// })
