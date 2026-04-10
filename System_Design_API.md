# ⚙️ 系统设计与 API 契约协议 (System Design & API Contracts)

基于 PRD 最终版，作为后端架构师，以下是一期需要实现的数据库模型设计 (Data Schema) 和核心接口协议 (REST APIs)，请前端和开发同学们 review。

---

## 💾 1. 数据库模型 (Database Schema - 核心设计)

推荐使用 PostgreSQL 或 MySQL，并采用 Prisma/TypeORM 进行映射。

### **1. 1 `users` (用户表)**
- `id` (UUID) - 主键
- `auth_provider` (Enum) - 注册来源 `WECHAT` | `GMAIL`
- `provider_uid` (String) - 微信 `openid`/`unionid` 或 Google `sub_id`。
  - *约束：联合唯一索引 `UNIQUE(auth_provider, provider_uid)`*
- `display_name` (String) - 供前端展示的用户脱敏名称或昵称
- `email` (String) - 针对 Gmail 提取的邮箱，或未来绑定的邮箱。
- `avatar_url` (String) - 用户头像地址。
- `available_credits` (Int) - 剩余检测次数，默认注册送 3 次。
- `device_token` (String) - 用于 APNs/FCM 推送的设备 Token。
- `created_at` (DateTime)
- `updated_at` (DateTime)

### **1.2 `credits_ledger` (额度流水对账表 - QA安全线)**
- `id` (UUID) - 主键
- `user_id` (UUID) - 外键关联 `users.id`
- `transaction_type` (Enum) - `SIGNUP_GIFT`, `PURCHASE_RECHARGE`, `DETECT_CONSUME`, `DETECT_REFUND`, `AD_REWARD`
- `amount` (Int) - 变更额度 (正负值)
- `reference_id` (String) - 关联的 `order_no` 或 `scan_history.id` 或 null
- `created_at` (DateTime)

### **1.3 `orders` (充值订单表 - 幂等性核心)**
- `order_no` (String) - 内部生成的唯一订单号 (如 UUID v4)。主键。
- `user_id` (UUID) - 外键关联 `users.id`
- `package_type` (Enum) - 购买的包类型，如 `BASIC_10`, `PRO_50`
- `status` (Enum) - 状态：`PENDING`, `SUCCESS`, `FAILED`
- `amount_cents` (Int) - 金额（分）
- `third_party_tx_id` (String) - 微信支付侧的回单号。*约束：唯一索引 (`UNIQUE`)*
- `created_at` (DateTime)
- `paid_at` (DateTime)

### **1.3 `scan_history` (检测历史表)**
- `id` (UUID) - 主键
- `user_id` (UUID) - 外键关联 `users.id`
- `image_url` (String) - 存在 S3/OSS 上的图片可访问临时地址
- `is_fake` (Boolean) - 检测结果
- `confidence_score` (Float) - 置信度
- `created_at` (DateTime)

---

## 📡 2. 核心 API 契约 (Core APIs)

### 2.1 鉴权模块 (Auth)

**1. `POST /api/v1/auth/login` - 统一三方登录**
*   **请求体**:
    ```json
    {
      "provider": "WECHAT", // 或 "GMAIL"
      "access_token": "xxxx", // 第三方 SDK 给到的 token/auth code
      "id_token": "xxxx" // 如果是 Google，传 JWT 的 id_token
    }
    ```
*   **响应 (200 OK)**:
    ```json
    {
      "token": "jwt_access_token",
      "user": {
        "id": "uuid",
        "credits": 3
      }
    }
    ```

**2. `GET /api/v1/auth/me` - 获取个人信息与额度**
*   **Header**: `Authorization: Bearer <jwt>`
*   **响应 (200 OK)** 同上 user object (包含 `display_name` 和 `avatar_url`)。

**3. `POST /api/v1/users/device-token` - 上报推送配置**
*   **Header**: `Authorization: Bearer <jwt>`
*   **请求体**:
    ```json
    {
      "device_token": "apns_or_fcm_token_string",
      "platform": "IOS" // "IOS" | "ANDROID"
    }
    ```
*   **响应 (200 OK)**: `{ "success": true }`

---

### 2.2 支付与交易模块 (Payments)

**1. `POST /api/v1/payments/create-order` - 初始化充值订单**
*   **Header**: `Authorization: Bearer <jwt>`
*   **请求体**:
    ```json
    { "package_type": "BASIC_10" }
    ```
*   **响应 (200 OK)**:
    ```json
    {
      "order_no": "ORD-12345",
      "wechat_pay_params": {
         // App 唤起微信支付所需的签名等参数
         "appid": "...", "noncestr": "...", "package": "Sign=WXPay", "prepayid": "...", "timestamp": "...", "sign": "..."
      }
    }
    ```

**2. `POST /api/v1/payments/webhook/wechat` - 微信支付异步回调**
*   **安全性**: 不带 JWT，但必须严校验微信官方的 Header Signature。
*   **内部逻辑**:
    1. 验签成功后，开启数据库事务 (Transaction)。
    2. 查询 `orders` 表 `order_no`。若状态已为 `SUCCESS`，直接返回 200 (幂等)。
    3. 若为 `PENDING`，改为 `SUCCESS` 并填入 `third_party_tx_id`。
    4. 对关联的 `users` 执行原子加分：`UPDATE users SET available_credits = available_credits + 10 WHERE id = ?`.
    5. 提交事务。

**3. `POST /api/v1/payments/sandbox-webhook` - 提供给 QA 的沙盒回调**
*   **注意**: 仅在 `NODE_ENV !== production` 时挂载生效。允许快速模拟某订单的成功回调。

**4. `GET /api/v1/payments/orders/:order_no/status` - 前端长轮询专用查单**
*   **Header**: `Authorization: Bearer <jwt>`
*   **响应 (200 OK)**:
    ```json
    {
      "status": "SUCCESS", // "PENDING" | "SUCCESS" | "FAILED"
      "updated_credits": 13 
    }
    ```

**5. `POST /api/v1/payments/webhook/ads` - 激励视频广告 Server-to-Server 回调验证**
*   **安全性**: 不带 JWT，根据第三方广告平台（如 AdMob）的签名规范进行强校验。
*   **请求体**: (根据具体广告网络决定，通常包含 user_id 和 reward_amount)
*   **内部逻辑**: 验签成功后，为对应 `user_id` 更新 `available_credits + 1`，并插入 `credits_ledger` 表记录。

---

### 2.3 探测模块重构 (Detect)

**1. `POST /api/v1/detect`**
*   **认证变更 (支持游客)**: 不再强制校验 JWT。
    *   **若带 JWT**: 走标准的已登录用户扣费逻辑。
    *   **若无 JWT**: 必须在 Header 或 Body 中携带 `X-Device-ID` (客户端生成的设备唯一标识) 或提取客户端 IP。
*   **并发控制与游客限流**: 
    *   **游客请求**: 在 Redis 中检查 `rate_limit:detect:device:<device_id>`。若有记录且 > 0，拒绝请求 (HTTP 402/403)。若无记录，放行并标记为已使用 (限 1 次免费体验)。
    *   **已登录请求**: 接收请求后，第一步尝试扣费。开启事务插入 `credits_ledger` (`amount: -1`) 并扣减 `available_credits`。
    ```sql
    UPDATE users 
    SET available_credits = available_credits - 1 
    WHERE id = :user_id AND available_credits >= 1;
    ```
    *若返回 affected_rows == 0，说明额度不足或并发扣空，直接拦截并报 HTTP 402 Payment Required。*
    *只有扣费成功，才继续请求 GPU 模型运算。若模型运算挂了，利用死信队列或 Try-Catch 将额度 +1 回退 (写入 `credits_ledger` `amount: +1` 作为补偿)。*

---

## 3. 下一步行动 (Next Steps)
前端与 QA 请对上述接口契约 (入参及异常 Http Code) 以及表结构进行评审。若无异议，后端即刻开始建表并编写 Express Controller 逻辑。
