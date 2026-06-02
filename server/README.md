# 数语交易中心服务端

这是 AI 对话数据交易中心的最小可上线服务端。它会同时提供：

- 网站静态页面
- 数据包列表接口
- 数据包发布接口
- 订单创建接口
- 简单文件数据库

## 本地运行

```bash
npm run build
npm start
```

默认访问地址：

```text
http://localhost:8787
```

## API

```http
GET /api/packages
```

读取交易大厅数据包。

```http
POST /api/packages
Content-Type: application/json
```

发布数据包。

```json
{
  "title": "科研对话数据包",
  "domain": "科研",
  "records": 6,
  "score": 86,
  "price": 239,
  "license": "商业训练",
  "tags": ["科研", "多轮修正"],
  "seller": "科研/专家认证",
  "sample": "脱敏后的对话样本"
}
```

```http
POST /api/orders
Content-Type: application/json
```

创建购买订单。

```json
{
  "packageId": "pkg-xxxx",
  "buyer": "模型公司试用账号"
}
```

## 上线建议

如果要让别人输入网址访问、上传并交易，请部署这个 Node 服务，而不是只部署 `www` 静态目录。

推荐平台：

- Render
- Railway
- Fly.io
- 自己的云服务器

部署参数：

- Build command: `npm run build`
- Start command: `npm start`
- Public directory: 不需要单独配置，服务端会自动提供 `www`
- Persistent data path: `server/data`

当前版本的支付状态是 `pending-payment`，还没有接入真实支付。正式商用前需要接入支付、实名认证、数据确权、合同授权、隐私审核和后台管理。
