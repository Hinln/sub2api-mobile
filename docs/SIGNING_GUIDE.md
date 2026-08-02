# 未签名 IPA 重新签名指南

1. 工作流产出的 IPA 是未签名包，不能直接在普通 iPhone 上运行。
2. 默认 Bundle ID 为 `com.vexlune.mobile`；Provisioning Profile 的 `application-identifier` 必须是 `<TeamID>.com.vexlune.mobile` 或与之兼容的合法通配值。
3. 当前 App 只使用网络、SecureStore 与 Face ID/Touch ID；没有扩展、Widget、Push、iCloud、App Groups、Associated Domains 或后台模式。
4. `HubVexlune.app/Frameworks` 中的动态 Framework 必须先递归签名，最后签名主 App。
5. 签名后执行 `codesign --verify --deep --strict --verbose=2 HubVexlune.app`，并检查 `codesign -d --entitlements :- HubVexlune.app`。
6. 更换 Bundle ID 时必须同时评估 URL Scheme `vexlunemobile`、SecureStore/Keychain 数据迁移和服务端登录状态。
7. 不要把 P12、私钥、密码或 Provisioning Profile 提交到仓库、日志或截图。
8. 不应使用会注入额外动态库的第三方签名服务。
9. 签名后再验证 IPA 根目录仍直接包含 `Payload/HubVexlune.app`。

## macOS 安全签名流程

以下流程仅使用临时 Keychain。`P12_PASSWORD` 和 `KEYCHAIN_PASSWORD` 必须由安全秘密注入，不能写进脚本或命令日志。

```bash
security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
security import "$P12_PATH" -k "$KEYCHAIN_PATH" -P "$P12_PASSWORD" -T /usr/bin/codesign
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"

security cms -D -i "$PROFILE_PATH" > "$RUNNER_TEMP/profile.plist"
```

在签名前必须读取 `Entitlements:application-identifier`，去除 Team ID 前缀后与 `com.vexlune.mobile` 比较。不一致时立即停止，不要修改 Apple 签名的 profile 内容。对于匹配的 profile，应从 profile 中取得 Team ID 和 Application Identifier，新建只包含当前 App 必需项的 entitlements：

- `application-identifier`
- `com.apple.developer.team-identifier`
- `keychain-access-groups`（默认为 Application Identifier）
- `get-task-allow = false`

不要盲目复制 profile 中与 App 无关的 Push、Associated Domains、Passkeys 或其他能力。

完成匹配检查后：

```bash
cp "$PROFILE_PATH" "$APP_PATH/embedded.mobileprovision"
find "$APP_PATH/Frameworks" -type d -name '*.framework' -print0 | while IFS= read -r -d '' framework; do
  codesign --force --sign "$SIGNING_IDENTITY" --timestamp=none "$framework"
done
codesign --force --sign "$SIGNING_IDENTITY" --entitlements "$RUNNER_TEMP/entitlements.plist" --timestamp=none "$APP_PATH"
codesign --verify --deep --strict --verbose=2 "$APP_PATH"
```

## 本机材料检查结论

`D:\苹果开发者证书\profile.mobileprovision` 是只包含一台设备的 Ad Hoc profile，有效期至 2027-07-28。P12 包含私钥，并已通过证书指纹比对确认与 profile 内的 Apple Distribution 证书匹配。但该 profile 的 Application Identifier 是 `VCUA692Y6H.app.eggplant4287.coral6481`，与 `com.vexlune.mobile` 不匹配。在取得匹配 profile 前，该材料不能用于产出保持当前 Bundle ID 的可安装 IPA。
