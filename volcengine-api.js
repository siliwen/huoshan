/**
 * 火山引擎API调用实现
 * 包含签名算法和完整的API调用逻辑
 */

class VolcEngineAPI {
    constructor(accessKey, secretKey, region = 'cn-north-1') {
        this.accessKey = accessKey;
        this.secretKey = secretKey;
        this.region = region;
        this.service = 'cv';
        this.host = 'visual.volcengineapi.com';
        this.endpoint = `https://${this.host}`;
    }

    /**
     * 调用图像风格化API
     * @param {Object} requestData - 请求数据
     * @returns {Promise<Object>} - API响应
     */
    async callImageStyleAPI(requestData) {
        const method = 'POST';
        const path = '/';
        const queryParams = {
            Action: 'CVProcess',
            Version: '2022-08-31'
        };

        try {
            console.log('准备API调用，请求数据:', requestData);
            
            const headers = await this.generateHeaders(method, path, queryParams, requestData);
            console.log('生成的请求头:', headers);
            
            const url = this.endpoint + path + '?' + new URLSearchParams(queryParams).toString();
            console.log('请求URL:', url);
            
            // 检查是否在HTTPS环境中
            if (location.protocol === 'file:' || location.protocol === 'http:') {
                throw new Error('由于浏览器安全限制，需要在HTTPS环境下调用API。请使用本地服务器或部署到HTTPS站点。');
            }
            
            const response = await fetch(url, {
                method: method,
                headers: headers,
                body: JSON.stringify(requestData),
                mode: 'cors'
            });

            console.log('响应状态:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API错误响应:', errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            console.log('API响应结果:', result);
            
            if (result.ResponseMetadata && result.ResponseMetadata.Error) {
                throw new Error(`API Error: ${result.ResponseMetadata.Error.Message}`);
            }

            return result;
        } catch (error) {
            console.error('API调用失败:', error);
            
            // 提供更详细的错误信息
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('网络连接失败，请检查网络连接或CORS设置');
            } else if (error.message.includes('CORS')) {
                throw new Error('跨域请求被阻止，请在服务器环境下运行或配置代理');
            }
            
            throw error;
        }
    }

    /**
     * 生成请求头
     * @param {string} method - HTTP方法
     * @param {string} path - 请求路径
     * @param {Object} queryParams - 查询参数
     * @param {Object} body - 请求体
     * @returns {Promise<Object>} - 请求头
     */
    async generateHeaders(method, path, queryParams, body) {
        const timestamp = Math.floor(Date.now() / 1000);
        const date = new Date(timestamp * 1000).toISOString().split('T')[0].replace(/-/g, '');
        
        const bodyHash = await this.sha256(JSON.stringify(body));
        
        const headers = {
            'Content-Type': 'application/json',
            'Host': this.host,
            'X-Date': new Date(timestamp * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z'),
            'X-Content-Sha256': bodyHash
        };

        // 生成签名
        const signature = await this.generateSignature(method, path, queryParams, headers, bodyHash, timestamp);
        
        headers['Authorization'] = this.buildAuthorizationHeader(signature, timestamp);

        return headers;
    }

    /**
     * 生成签名
     * @param {string} method - HTTP方法
     * @param {string} path - 请求路径
     * @param {Object} queryParams - 查询参数
     * @param {Object} headers - 请求头
     * @param {string} bodyHash - 请求体哈希
     * @param {number} timestamp - 时间戳
     * @returns {Promise<string>} - 签名
     */
    async generateSignature(method, path, queryParams, headers, bodyHash, timestamp) {
        const date = new Date(timestamp * 1000).toISOString().split('T')[0].replace(/-/g, '');
        
        // 1. 创建规范请求
        const canonicalRequest = this.createCanonicalRequest(method, path, queryParams, headers, bodyHash);
        
        // 2. 创建待签名字符串
        const credentialScope = `${date}/${this.region}/${this.service}/request`;
        const stringToSign = [
            'HMAC-SHA256',
            new Date(timestamp * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z'),
            credentialScope,
            await this.sha256(canonicalRequest)
        ].join('\n');

        // 3. 计算签名
        const signingKey = await this.getSigningKey(date);
        const signature = await this.hmacSha256(stringToSign, signingKey);

        return signature;
    }

    /**
     * 创建规范请求
     * @param {string} method - HTTP方法
     * @param {string} path - 请求路径
     * @param {Object} queryParams - 查询参数
     * @param {Object} headers - 请求头
     * @param {string} bodyHash - 请求体哈希
     * @returns {string} - 规范请求
     */
    createCanonicalRequest(method, path, queryParams, headers, bodyHash) {
        // 规范化查询参数 - 火山引擎要求特定的编码方式
        const sortedParams = Object.keys(queryParams).sort().map(key => {
            const encodedKey = encodeURIComponent(key).replace(/%20/g, '+');
            const encodedValue = encodeURIComponent(queryParams[key]).replace(/%20/g, '+');
            return `${encodedKey}=${encodedValue}`;
        }).join('&');

        // 规范化请求头 - 只包含签名相关的头部
        const signedHeaderNames = ['content-type', 'host', 'x-content-sha256', 'x-date'];
        const canonicalHeaders = signedHeaderNames.map(name => {
            const value = headers[name] || headers[name.split('-').map(part => 
                part.charAt(0).toUpperCase() + part.slice(1)
            ).join('-')];
            return `${name}:${value ? value.trim() : ''}`;
        }).join('\n');

        const signedHeaders = signedHeaderNames.join(';');

        const canonicalRequest = [
            method,
            path,
            sortedParams,
            canonicalHeaders,
            '',
            signedHeaders,
            bodyHash
        ].join('\n');

        console.log('规范请求:', canonicalRequest);
        return canonicalRequest;
    }

    /**
     * 获取签名密钥
     * @param {string} date - 日期字符串
     * @returns {Promise<ArrayBuffer>} - 签名密钥
     */
    async getSigningKey(date) {
        const kDate = await this.hmacSha256(date, `volc_v4${this.secretKey}`);
        const kRegion = await this.hmacSha256(this.region, kDate);
        const kService = await this.hmacSha256(this.service, kRegion);
        const kSigning = await this.hmacSha256('request', kService);
        return kSigning;
    }

    /**
     * 构建Authorization头
     * @param {string} signature - 签名
     * @param {number} timestamp - 时间戳
     * @returns {string} - Authorization头值
     */
    buildAuthorizationHeader(signature, timestamp) {
        const date = new Date(timestamp * 1000).toISOString().split('T')[0].replace(/-/g, '');
        const credentialScope = `${date}/${this.region}/${this.service}/request`;
        const credential = `${this.accessKey}/${credentialScope}`;
        const signedHeaders = 'content-type;host;x-content-sha256;x-date';

        return `HMAC-SHA256 Credential=${credential}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    }

    /**
     * SHA256哈希
     * @param {string} data - 数据
     * @returns {Promise<string>} - 哈希值
     */
    async sha256(data) {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * HMAC-SHA256
     * @param {string} data - 数据
     * @param {string|ArrayBuffer} key - 密钥
     * @returns {Promise<string|ArrayBuffer>} - HMAC值
     */
    async hmacSha256(data, key) {
        const encoder = new TextEncoder();
        
        let keyBuffer;
        if (typeof key === 'string') {
            keyBuffer = encoder.encode(key);
        } else {
            keyBuffer = key;
        }

        const dataBuffer = encoder.encode(data);
        
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyBuffer,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );

        const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);
        
        // 如果key是字符串，返回十六进制字符串；否则返回ArrayBuffer
        if (typeof key === 'string') {
            const signatureArray = Array.from(new Uint8Array(signature));
            return signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } else {
            return signature;
        }
    }
}

/**
 * 图像风格化客户端
 */
class ImageStyleClient {
    constructor(accessKey, secretKey, region = 'cn-north-1') {
        this.api = new VolcEngineAPI(accessKey, secretKey, region);
    }

    /**
     * 风格化图像
     * @param {Object} options - 选项
     * @param {string} options.reqKey - 风格类型
     * @param {string} options.subReqKey - 子风格类型
     * @param {string} options.base64Data - 图片Base64数据
     * @param {boolean} options.returnUrl - 是否返回URL
     * @param {Object} options.logoInfo - 水印信息
     * @param {Object} options.aigcMeta - AIGC元数据
     * @returns {Promise<Object>} - 处理结果
     */
    async styleImage(options) {
        const {
            reqKey,
            subReqKey = '',
            base64Data,
            returnUrl = true,
            logoInfo = null,
            aigcMeta = null
        } = options;

        const requestData = {
            req_key: reqKey,
            binary_data_base64: [base64Data],
            return_url: returnUrl
        };

        // 添加子风格类型（如果有）
        if (subReqKey) {
            requestData.sub_req_key = subReqKey;
        }

        // 添加水印信息（如果有）
        if (logoInfo) {
            requestData.logo_info = logoInfo;
        }

        // 添加AIGC元数据（如果有）
        if (aigcMeta) {
            requestData.aigc_meta = aigcMeta;
        }

        try {
            const result = await this.api.callImageStyleAPI(requestData);
            return result;
        } catch (error) {
            console.error('图像风格化失败:', error);
            throw error;
        }
    }

    /**
     * 批量风格化图像
     * @param {Array} imageList - 图像列表
     * @param {Object} styleConfig - 风格配置
     * @returns {Promise<Array>} - 处理结果列表
     */
    async batchStyleImages(imageList, styleConfig) {
        const results = [];
        
        for (const imageData of imageList) {
            try {
                const result = await this.styleImage({
                    ...styleConfig,
                    base64Data: imageData
                });
                results.push({ success: true, data: result });
            } catch (error) {
                results.push({ success: false, error: error.message });
            }
        }

        return results;
    }
}

// 导出类供使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { VolcEngineAPI, ImageStyleClient };
} else {
    window.VolcEngineAPI = VolcEngineAPI;
    window.ImageStyleClient = ImageStyleClient;
}

/**
 * 使用示例：
 * 
 * const client = new ImageStyleClient('your-access-key', 'your-secret-key');
 * 
 * const result = await client.styleImage({
 *     reqKey: 'img2img_disney_3d_style',
 *     subReqKey: '',
 *     base64Data: 'your-base64-image-data',
 *     returnUrl: true,
 *     logoInfo: {
 *         add_logo: true,
 *         position: 0,
 *         language: 0,
 *         opacity: 1.0
 *     }
 * });
 * 
 * console.log(result);
 */