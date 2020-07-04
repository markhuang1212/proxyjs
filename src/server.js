const http = require('http')
const https = require('https')
const net = require('net')
const url = require('url')
const fs = require('fs')
const path = require('path')
const { type } = require('os')

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
    if (req.headers.host.split(':')[0] != hostname) {
        // if(false){
        if (!req.socket.authorized) {
            console.log('unauthorized')
            return ''
        }

        console.log(req.url + ' ' + req.socket.getPeerCertificate().subject.CN + ' INSECURE REQUEST!')

        var proxy = http.request({
            hostname: req.headers.host.split(':')[0],
            port: req.headers.host.split(':')[1],
            path: req.url,
            method: req.method,
            headers: req.headers
        }, resFromServer => {
            res.writeHead(resFromServer.statusCode, resFromServer.headers)
            resFromServer.pipe(resFromServer, { end: true })
        })

        proxy.setTimeout(120000, () => {
            proxy.destroy()
        })

        proxy.on('error', () => {
            if (typeof proxy != 'undefined') {
                proxy.destroy()
            }
        })

        res.pipe(proxy, { end: true })

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
    if (!req.socket.authorized) {
        console.log('unauthorized')
        return ''
    }

    console.log(req.url + ' ' + req.socket.getPeerCertificate().subject.CN)

    const { port, hostname } = url.parse(`http://${req.url}`)

    const srvSocket = net.connect(port, hostname, () => {
        cltSocket.write('HTTP/1.1 200 Connection Established\r\n' +
            'Proxy-agent: Node.js-Proxy\r\n' + '\r\n')
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
        if (typeof cltSocket !== 'undefined')
            cltSocket.destroy()
    })

    cltSocket.on('error', err => {
        console.error(`client socket error: ${err.message}`)
        if (typeof srvSocket !== 'undefined')
            srcSocket.destroy()
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
