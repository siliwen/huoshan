# 火山引擎图像风格化应用

基于火山引擎图像生成大模型API的图像风格化Web应用，支持多种艺术风格转换。

## 功能特性

- 🎨 **多种风格选择**: 支持24种不同的艺术风格，包括动漫风、3D风、水墨风等
- 📸 **图片上传**: 支持拖拽上传和点击选择，支持JPG、JPEG、PNG格式
- 🔒 **安全认证**: 集成火山引擎API签名算法，确保安全调用
- 💫 **实时预览**: 上传后即时显示图片预览
- 📱 **响应式设计**: 适配桌面和移动设备
- ⚡ **快速处理**: 高效的图像处理和结果展示

## 支持的风格类型

| 风格名称 | 描述 | 风格名称 | 描述 |
|---------|------|---------|------|
| 网红日漫风 | 流行的日式动漫风格 | 3D风 | 迪士尼3D动画风格 |
| 写实风 | 真实感强的混合风格 | 天使风 | 柔和的天使系风格 |
| 动漫风 | 经典动漫风格 | 日漫风 | 新海诚风格 |
| 公主风 | 梦幻公主风格 | 梦幻风 | 蓝线梦幻风格 |
| 水墨风 | 中国传统水墨画风格 | 新莫奈花园 | AI创作莫奈风格 |
| 水彩风 | 水彩画风格 | 莫奈花园 | 莫奈印象派风格 |
| 精致美漫 | 精致的美式漫画风格 | 赛博机械 | 未来科技风格 |
| 精致韩漫 | 精致的韩式漫画风格 | 国风-水墨 | 中国风水墨风格 |
| 浪漫光影 | 浪漫的光影效果 | 陶瓷娃娃 | 陶瓷质感风格 |
| 中国红 | 中国红主题风格 | 丑萌粘土 | 3D粘土风格 |
| 可爱玩偶 | 泡泡玩偶风格 | 3D-游戏_Z时代 | Z时代游戏风格 |
| 动画电影 | 3D动画电影风格 | 玩偶 | 3D玩偶风格 |

## 使用方法

### 1. 获取API密钥

首先需要在火山引擎控制台获取Access Key和Secret Key：

1. 访问 [火山引擎控制台](https://console.volcengine.com/)
2. 注册并登录账号
3. 开通视觉智能服务
4. 在API密钥管理中创建Access Key和Secret Key

### 2. 配置应用

1. 打开 `index.html` 文件
2. 在"API配置"区域填入您的Access Key和Secret Key
3. 选择Region（默认为cn-north-1）

### 3. 上传图片

- **方式一**: 点击"选择图片"按钮，从本地选择图片
- **方式二**: 直接拖拽图片到上传区域

**图片要求**:
- 格式：JPG、JPEG、PNG
- 大小：最大5MB
- 分辨率：600×800 到 4096×4096

### 4. 选择风格

在风格选择区域点击您想要的艺术风格。

### 5. 生成图片

点击"开始生成"按钮，等待处理完成。

### 6. 下载结果

处理完成后，可以预览生成的图片并点击"下载图片"保存到本地。

## 文件结构

```
huoshan/
├── index.html              # 主页面文件
├── volcengine-api.js       # 火山引擎API调用实现
└── README.md              # 说明文档
```

## 技术实现

### 前端技术
- **HTML5**: 现代化的页面结构
- **CSS3**: 响应式设计和动画效果
- **JavaScript ES6+**: 异步处理和API调用
- **Web Crypto API**: 用于签名算法实现

### API集成
- **火山引擎视觉智能API**: 图像风格化服务
- **HMAC-SHA256签名**: 安全的API认证
- **Base64编码**: 图片数据传输

### 核心功能实现

#### 1. 图片处理
```javascript
// 文件转Base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
```

#### 2. API签名算法
```javascript
// HMAC-SHA256签名
async hmacSha256(data, key) {
    const encoder = new TextEncoder();
    const keyBuffer = typeof key === 'string' ? encoder.encode(key) : key;
    const dataBuffer = encoder.encode(data);
    
    const cryptoKey = await crypto.subtle.importKey(
        'raw', keyBuffer, 
        { name: 'HMAC', hash: 'SHA-256' }, 
        false, ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);
    return signature;
}
```

#### 3. API调用
```javascript
// 调用图像风格化API
async callImageStyleAPI(requestData) {
    const headers = await this.generateHeaders('POST', '/', queryParams, requestData);
    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestData)
    });
    return await response.json();
}
```

## 安全注意事项

1. **密钥保护**: 不要在客户端代码中硬编码API密钥
2. **HTTPS使用**: 生产环境中务必使用HTTPS协议
3. **输入验证**: 对上传的文件进行严格的格式和大小验证
4. **错误处理**: 妥善处理API调用错误和网络异常

## 浏览器兼容性

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

需要支持Web Crypto API和ES6+语法。

## 常见问题

### Q: API调用失败怎么办？
A: 请检查：
1. Access Key和Secret Key是否正确
2. 网络连接是否正常
3. 图片格式和大小是否符合要求
4. 是否有足够的API调用额度

### Q: 支持哪些图片格式？
A: 支持JPG、JPEG、PNG格式，建议使用JPG格式以获得最佳性能。

### Q: 图片处理需要多长时间？
A: 通常在2-10秒内完成，具体时间取决于图片大小和网络状况。

### Q: 可以批量处理图片吗？
A: 当前版本支持单张图片处理，批量处理功能可以通过调用`batchStyleImages`方法实现。

## 开发者信息

本应用基于火山引擎图像生成大模型API开发，遵循官方API文档规范。

- API文档: https://www.volcengine.com/docs/86081/1660231
- 技术支持: 火山引擎官方技术支持

## 许可证

本项目仅供学习和参考使用，商业使用请遵循火山引擎服务条款。