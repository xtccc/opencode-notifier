# OpenCode Notifier 插件开发指南

## 事件对应关系

| Event | 开始事件 | 结束事件 | 备注 |
|-------|----------|----------|------|
| permission | `permission.ask` | `permission.replied` | 用户授权请求 |
| complete | `session.idle` | `session.update` 或 `message.update` | 主会话完成 |
| subagent_complete | `session.idle` | `session.update` 或 `message.update` | 子会话完成 (通过 parentID 判断) |
| error | `session.error` | `session.update` 或 `message.update` | 会话错误 |
| question | `tool.execute.before` (tool === "question") | `tool.execute.after` (tool === "question") | 用户提问 |

**注意**：`tui.prompt.append` 事件不会被 OpenCode 自动触发（只通过 HTTP API 调用），因此改用 `session.update` 和 `message.update` 作为用户活动的判断依据。

## 事件说明

- **开始事件**：触发通知的条件
- **结束事件**：取消 pending 通知的条件（用于 suppressWhenFocused 功能）

## 业务逻辑

### suppressWhenFocused 功能

当 `suppressWhenFocused` 启用时，每个事件类型独立处理：

1. **开始事件触发**：记录该事件类型的开始时间
2. **等待 focusWindowSeconds 秒**
3. **检查结束事件**：
   - 如果在 focusWindowSeconds 内收到对应的结束事件 → 用户仍在软件前，取消通知
   - 如果超过 focusWindowSeconds 未收到结束事件 → 发送 Gotify 通知（自定义命令）

### 状态管理

每种事件类型维护独立的状态：

```typescript
type EventState = {
  startTime: number | null      // 开始时间
  hasEnded: boolean             // 是否已收到结束事件
  timeout: ReturnType<typeof setTimeout> | null  // 定时器
  data: PendingNotificationData | null  // 通知数据
}

// 5 种事件类型各自独立的状态
const eventStates: Record<EventType, EventState> = {
  permission: { startTime: null, hasEnded: false, timeout: null, data: null },
  complete: { startTime: null, hasEnded: false, timeout: null, data: null },
  subagent_complete: { startTime: null, hasEnded: false, timeout: null, data: null },
  error: { startTime: null, hasEnded: false, timeout: null, data: null },
  question: { startTime: null, hasEnded: false, timeout: null, data: null },
}
```

### 流程图

```
开始事件触发
       │
       ▼
设置 eventType.startTime = now
设置 eventType.hasEnded = false
       │
       ▼
设置定时器 (delay = focusWindowSeconds)
       │
       ▼
    ┌───┴───┐
    │ 等待  │
    │ focusWindowSeconds │
    └───┬───┘
       │
       ▼
  定时器触发
       │
       ▼
检查 eventType.hasEnded
       │
    ┌──┼──┐
    │  │  │
    ▼  ▼  ▼
  true  false
    │    │
    │    ▼
    │  发送通知
    │  (Gotify/系统通知/声音)
    │
    ▼
  取消 pending
  重置状态
```

### 结束事件处理

收到结束事件时，设置 `eventType.hasEnded = true`，并取消该事件类型的 pending 通知，同时重置状态（`startTime = null`, `hasEnded = false`）。

### 用户输入时取消通知

当检测到用户输入时（`tui.input.changed` 事件），调用 `cancelAllPendingNotifications()` 取消所有 pending 通知并重置状态。

### 通知发送条件

满足以下条件时发送通知：
1. 定时器触发时 `hasEnded === false`
2. 或 `suppressWhenFocused` 为 false 时立即发送
