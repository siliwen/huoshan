/**
 * 简单的CORS代理服务器
 * 用于解决浏览器调用火山引擎API的跨域问题
 */

const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 3001;

const server = http.createServer((req, res) => {
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Date, X-Content-Sha256, Host');
    res.setHeader('Access-Control-Max-Age', '86400');

    // 处理预检请求
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // 只处理POST请求到火山引擎API
    if (req.method === 'POST' && req.url.includes('/proxy/volcengine')) {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const requestData = JSON.parse(body);
                const { targetUrl, headers, data } = requestData;

                console.log('代理请求到:', targetUrl);
                console.log('请求头:', headers);

                const parsedUrl = url.parse(targetUrl);
                const options = {
                    hostname: parsedUrl.hostname,
                    port: parsedUrl.port || 443,
                    path: parsedUrl.path,
                    method: 'POST',
                    headers: headers
                };

                const proxyReq = https.request(options, (proxyRes) => {
                    let responseData = '';

                    proxyRes.on('data', chunk => {
                        responseData += chunk;
                    });

                    proxyRes.on('end', () => {
                        res.writeHead(proxyRes.statusCode, {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        });
                        res.end(responseData);
                    });
                });

                proxyReq.on('error', (error) => {
                    console.error('代理请求错误:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                });

                proxyReq.write(JSON.stringify(data));
                proxyReq.end();

            } catch (error) {
                console.error('解析请求错误:', error);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: '请求格式错误' }));
            }
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '不支持的请求' }));
    }
});

server.listen(PORT, () => {
    console.log(`CORS代理服务器运行在 http://localhost:${PORT}`);
    console.log('使用方法: POST /proxy/volcengine');
});

module.exports = server;