const net = require('net')
const fs = require('fs')
const path = require('path')
const tls = require('tls')

const CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json')))

// CONFIG START
const clientKey = fs.readFileSync(CONFIG.clientSSL.key)
const clientCert = fs.readFileSync(CONFIG.clientSSL.cert)
const clientPort = CONFIG.localPort
const host = CONFIG.host
const remotePort = CONFIG.remotePort
// CONFIG END

const clientServer = net.createServer(cltSocket => {
    const remoteSocket = tls.connect({
        host,
        port: remotePort,
        servername: host,
        cert: clientCert,
        key: clientKey,
        ALPNProtocols: ['http/1.1']
    }, () => {
        console.log('connection with proxy server established')
        cltSocket.pipe(remoteSocket)
        remoteSocket.pipe(cltSocket)
    })
    remoteSocket.on('error', e => {
        console.error(`remote socket error: ${e.message}`)
        cltSocket.destroy()
        remoteSocket.destroy()
    })
    cltSocket.on('error', e => {
        console.error(`client socket error: ${e.message}`)
        cltSocket.destroy()
        remoteSocket.destroy()
    })
    remoteSocket.setTimeout(120000, () => {
        console.error('remote socket time out')
        remoteSocket.destroy()
    })
    cltSocket.setTimeout(120000, () => {
        console.error('client socket time out')
        cltSocket.destroy()
    })
})

clientServer.listen(clientPort, '0.0.0.0', () => {
    console.log(`client server listening at port ${clientPort}`)
})

process.on('uncaughtException', e => {
    console.error(`uncauthe error: ${e.message}`)
})