# simple-https-proxy

## Configuration

A `config.json` should be placed in the root folder. A example configuration file is in `config.example`

A sample `config.json` file is as follows:

## Client Certificate

Client certificate is recommended for authentification over a password-username based authentification

To generate a key-cert pair, use `openssl`.

```bash
$ openssl req -newkey rsa:2048 -nodes -keyout key.pem -x509 -days 3650 -out cert.pem
```

To transform the key-cert pair into `.p12` format

```bash
$ openssl pkcs12 -inkey key.pem -in cert.pem -export -out cert.p12
```

To turn the `.p12` file into Base64 string

```bash
$ openssl base64 -in cert.p12 -out cert.p12.base64
```

## Enable BBR for acceleration

Add this to `/etc/sysctl.conf`

```
net.core.default_qdisc=fq
net.ipv4.tcp_congestion_control=bbr
```

To save,

```
sysctl -p
```

To check,

```
lsmod | grep bbr
```

## Run on background on client side

Use `forever`.

```bash
$ npm i -g forever
$ forever start src/client.js
```

## Run as a Linux systemd service

For server side only. Sudo required.

```bash
$ node ./install.js
$ systemctl daemon-reload
$ systemctl start proxy-server
```