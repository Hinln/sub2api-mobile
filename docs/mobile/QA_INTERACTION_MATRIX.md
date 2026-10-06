# Vexlune Hub 管理员 APP 交互 QA 矩阵

检查日期：2026-10-06（Asia/Shanghai）。

本表区分了可以在当前工作区静态确认的路由/动作、已经在 iOS Simulator
运行确认的入口，以及需要生产 Admin Key 和服务端数据才能确认的项目。生产
服务器、Cloudflare 规则和数据库没有被修改。

## 启动与认证

| 页面/动作 | 预期 | 证据 | 状态 |
|---|---|---|---|
| 原生启动 | 使用全屏原生背景，不加载旧正方形 `SplashScreenLegacy` | `SplashScreen.storyboard` 已移除旧 image view；Release 包内无旧 imageset；`build/ios-admin-ui-round6/screenshots/launch-after-load.png` | 通过 |
| Admin Key 空值提交 | 不发请求并保持登录页 | `app/login.tsx` 的输入校验与按钮禁用逻辑 | 静态通过 |
| Admin Key 显示/隐藏 | 仅切换当前输入可见性 | `app/login.tsx` 的可见性 Pressable | 静态通过 |
| Admin Key 登录成功 | 只读验证成功后进入首页 | `validateAdminKey`、`router.replace('/')`；iPhone 17 Pro Max Simulator 使用授权 Admin Key 实测进入首页 | 通过（真实接口） |
| 无效 key / 401 | 清除 key，停留在登录页并显示错误 | `src/auth/session.ts`、`tests/admin-auth.test.ts` | 自动化通过，设备未执行 |
| 有效会话冷启动 | 进入首页，不默认进入监控 | `app/(tabs)/_layout.tsx` `initialRouteName="index"` 与登录重定向 | 静态通过；模拟器无 Keychain entitlement 时重启回到 Key 页，见限制 |

## 主导航与二级页面

| 页面 | 入口/可操作控件 | 真实接口/动作 | 状态 |
|---|---|---|---|
| 首页 | 8 项今日概览；用户、账号、分组、公告四个快捷入口；Sub2API 运维状态卡（健康分、QPS/TPS、SLA、错误率、延迟、CPU/内存、DB/Redis、任务心跳）；查看监控；下拉刷新 | `/api/v1/admin/dashboard/stats`、`/api/v1/admin/payment/dashboard`、`/api/v1/admin/ops/dashboard/overview`、设置/版本接口 | 通过（真实接口）；证据 `build/ios-admin-ops-round9/screenshots/home-final.png` |
| 监控 | 刷新；请求量/Token/实际计费切换；异常聚合；账号状态；用户/分组/订单/公告快捷入口；最近活动 | 官方 dashboard、趋势、账号、告警和错误接口 | 通过（真实接口）；证据 `build/ios-admin-ops-round9/screenshots/monitor-final.png` |
| 用户 | 搜索、状态筛选、筛选展开、创建入口、分页、用户详情 | 官方用户列表、创建和详情接口 | 静态通过；写操作未提交 |
| 设置 | 站点信息、连接配置、安全设置、审计告警、公告、运行日志、异常、更多、主题、保存连接 | 官方设置/验证/审计/告警接口 | 静态通过；在线验证阻塞 |
| 更多 | 异常、分组、用户、公告、订单、审计、连接安全、关于、系统设置、退出 | 各官方管理接口；退出清除本地会话 | 静态通过；写操作未提交 |
| 上游账号 | 搜索、分页、详情、刷新凭据、清除错误、批量删除（确认边界） | 官方 accounts API | 静态通过；写操作未提交 |
| 分组与模型 | 分组列表、详情/编辑入口和返回 | 官方 groups API | 通过（真实列表） |
| 订单与收入 | 状态筛选、刷新、取消/重试履约/退款/查询退款状态 | 官方支付/订单 API | 静态通过；破坏性动作停在确认边界 |
| 公告与通知 | 刷新、新建表单、发布、删除（确认前） | 官方公告 API | 静态通过；写操作未提交 |
| 异常中心 | 异常账号列表、查看账号、查看全部 | 官方 accounts/error API | 通过（真实列表/告警聚合） |
| 请求日志 | 分页、日志详情、复制 request ID | 官方 request logs API；不复制密码/token | 静态通过；尚未展开详情 |
| 审计与告警 | 审计/告警切换、告警处理 | 官方 audit/alert API | 静态通过；写操作未提交 |
| 关于 | 返回、版本、安全说明、许可 | 本地构建元数据 | 静态通过 |
| 用户详情 | 余额调整、启用/禁用、API Key/配额查看（确认前） | 官方 user detail/balance/status API | 静态通过；写操作停在确认边界 |
| 创建用户 | 邮箱、密码、用户名、备注、余额校验和二次确认 | 官方 create-user API | 静态通过；未提交生产写请求 |
| 上游账号详情 | 测试、刷新、清除错误、启用/停用、删除（确认前） | 官方 account API | 通过（真实详情）；写操作停在确认边界；自定义返回按钮显示“返回” |

## 当前运行证据与限制

- 已安装并启动最终验证产物：
  `build/ios-admin-ops-round9/Build/Products/Release-iphonesimulator/VexluneMobileConsole.app`。
- 使用用户授权的真实 Admin Key 完成了登录 → 首页 → 身份 → 监控 Ops → 用户 →
  上游账号 → 账号详情 → 分组与模型 → 订单与收入 → 设置 → 后台恢复的有界 smoke test。
  首页真实返回 `Emotion`、`Admin Key · 已连接`、Sub2API `0.2.13`，运维卡片真实返回
  健康评分、QPS/TPS、SLA、错误率、P99、CPU/内存、DB/Redis 和后台任务。
- 首页与监控截图分别保存为：
  `build/ios-admin-ops-round9/screenshots/home-final.png`、
  `build/ios-admin-ops-round9/screenshots/monitor-final.png`。
- 账号详情页原先显示 `(tabs)` 的 Expo Router 内部标题，已改为自定义图标返回按钮；
  最新构建 AX 证据为 `返回`，不再泄露内部路由名。
- 模拟器 Release 包没有正式签名的 Keychain entitlement，杀进程后会回到 Admin Key
  页面；没有为通过测试而把 key 写入明文存储。正式签名的 TestFlight 包需在真机复核
  Keychain 持久化，这是当前唯一未在模拟器完成的认证场景。

## 最终检查

- `pnpm typecheck`：通过。
- `pnpm lint`：通过。
- `pnpm test -- --run`：13 个文件、72 项测试通过。
- `git diff --check`：通过。
- 原生 Xcode Release Simulator build：通过；最终产物为 `build/ios-admin-ops-round9`；未使用 Expo/EAS 云构建。
