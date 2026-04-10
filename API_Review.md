# 📡 API 与表结构多角色联调审查 (API & Schema Review)

作为**前端架构师**与**QA专家**，我们对《系统设计与 API 契约协议》(`${System_Design_API.md}`) 进行了 Review，补充了真实调用场景下可能缺失的字段和测试难点。

---

## 🌐 前端架构师 (Frontend Dev) 审查意见

> "接口能跑通不代表 UI 能画对，需要补充用于渲染的关键字段和状态定义。"

### 1. 鉴权与用户信息 (Auth & User Profile)
*   **关于 Token 刷新**：目前的登录契约缺少 Refresh Token 机制。建议补充一个 `/api/v1/auth/refresh` 接口，以便当 access_token 过期拦截时，前端能静默刷新。或者明确 Token 的超长生命周期设定。
*   **缺失的脱敏信息**：`GET /api/v1/auth/me` 返回的 `user` 对象中，缺少可以直接展示在 UI 上的字段。
    *   **建议修改**: `/api/v1/auth/me` 的 Response 应当增加 `display_name` (如 "WeChat User_xxx" 或脱敏邮箱) 和 `avatar_url`（如有）。

### 2. 支付链路状态机 (Payments)
*   **长轮询缺乏明确接口**：PRD 要求支付后前端最多长轮询 5 次查询最新额度，但并没有提供一个轻量的状态查询接口。如果每次都通过 `/auth/me` 拉取全量信息，浪费资源。
    *   **建议增设**: `GET /api/v1/payments/orders/:order_no/status`，返回 `{ "status": "SUCCESS" | "PENDING" | "FAILED", "updated_credits": 13 }`。前端通过此接口判断 Loading 动画何时结束。

---

## 🛡️ 质量保证专家 (QA) 审查意见

> "没有任何接口是绝对安全的，尤其是涉及支付和资产扣减的接口。"

### 1. 并发与资产安全 (Concurrency)
*   **历史明细对账**：目前 `scan_history` 记录了所有的 AI 检测，但缺少一张表用于记录“额度的变更流水 (Credits Ledger)”。如果一个用户投诉“我的次数凭空消失了”，客服或 QA 无法通过查库来判定是充值加的、注册送的、还是某条异常消耗掉的。
    *   **建议增设**: `credits_ledger` 表，记录每一次额度的入账与出账明细，携带 `transaction_type` (如 `RECHARGE_BASIC_10`, `DETECT_CONSUME`)。

### 2. Mock 与测试环境隔离 (Sandbox Mode)
*   `POST /api/v1/payments/sandbox-webhook` 的存在是非常好的。但我要求该 Sandbox 接口在被调用时，必须能够指定 `order_no` 和预期的 `status`。
    *   **测试断言需求**：该接口入参必须为 `{ "order_no": "ORD-123", "mock_status": "SUCCESS" }`。触发后后端执行真实的回调状态流转和数据库落钞动作。

---

### 📝 结论与修订建议

建议后端同学在 `System_Design_API.md` 中补充：
1. **一个订单状态查询接口** (`/api/v1/payments/orders/:order_no/status`) 供前端实现轮询动画。
2. **一个额度流水审计表** (`credits_ledger`) 供 QA 进行边界并发测试后的对账。

只要补充以上两点，这套 API 契约可谓无懈可击，可以立即进入 Executuion 阶段！
