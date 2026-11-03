# pen-lab

词典笔**整机测试实验室**（HaaS UI / Falcon 小程序）。

在笔端安装一个测试 App，点按钮即可运行各项整机测试——不需要连电脑。

## 核心机制

App 只做**控制面板**：点「开始」同时后台启动两个设备端 shell 脚本，点「停止」同时停止。

- `monkey.sh` — 整机随机测试（随机点击/滑动/扫描/拍照/语音/下拉菜单）
- `grafana.sh` — 同步采集设备状态（电池/温度/内存/CPU/进程）

为什么不用 App 直接注入触摸：参考项目实测 `execShell` 同步阻塞，且 App 在前台注入触摸会点到自己，容易拖垮整个 miniapp 运行时。独立 shell 脚本进程稳定得多。

两个脚本内容**内嵌在 App 里**，首次运行自动落地到设备，无需手动 push。

## 测试项（对应 monkey.sh 子模式）

1. **随机稳定性** → `monkey.sh`（默认混合：DICT 30% + 小P 30% + APP 20% + 综合 20%）
2. **点查** → `monkey.sh dict`（循环查词）
3. **拍照** → `monkey.sh rand`（综合：AI拍照/OCR/语音/下拉菜单）
4. **扫描** → `monkey.sh ocr`（OCR 循环扫描）
5. **语音问答** → `monkey.sh xiaop`（小P老师）

每个测试项都同步启动 grafana.sh 采集设备状态。

## 启停机制

- 启动：`echo $$ > pidfile; exec sh 脚本`，PID 记录到 `/userdisk/monkey.pid`、`/userdisk/grafana.pid`
- 停止：`kill -9 $(cat pidfile)` 按 PID 精确杀

用 pidfile 而不是 pkill，是因为 `pkill -f` 会匹配到「命令行含关键词的自己」，导致 pkill 自杀、脚本没被杀干净。

## 构建

```bash
npm install
npm run build
adb push 8000000000182402.<版本>.amr /userdisk/Favorite/
adb shell "miniapp_cli install /userdisk/Favorite/8000000000182402.<版本>.amr"
adb shell "miniapp_cli start 8000000000182402"
```

## 目录结构

```
src/
  tester/
    actions.js          整机控制层（脚本启停、pidfile 管理）
    grafana-script.js   内嵌的 grafana.sh（生成，勿手改）
    monkey-script.js    内嵌的 monkey.sh（生成，勿手改）
  pages/index/          测试菜单 + 结果 UI
  services/platform.js  execShell 等平台层
scripts/
  list-apps.sh          列出设备所有系统应用 appid
```

## 结果位置

- grafana 监控日志：`/userdisk/testlog/grafana/`
- monkey 测试总结：`/userdisk/testlog/test_summary_<SN>.txt`

## License

MIT
