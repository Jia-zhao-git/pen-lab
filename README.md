# pen-lab

词典笔**整机测试实验室**（HaaS UI / Falcon 小程序）。

在笔端安装一个测试 App，点按钮即可运行各项整机测试——不需要连电脑。

## 核心机制

小程序通过 `execShell`（`global.Global.execShell`）执行系统命令，驱动整机：

- `miniapp_cli start <appid>` — 启动任意系统应用
- `send_event <key> <action>` — 注入按键/触摸
- `miniapp_cli captureFB` — 截 framebuffer
- `miniapp_cli memoryApp` — 查内存

## 测试项

1. **扫描/相机** — 启动提笔即扫OCR、AI拍照，触发相机键，验证不崩溃
2. **点查** — 启动有道词典，触发扫描查词，反复进出验证稳定性
3. **语音问答** — 启动小P老师、录音服务，触发语音键
4. **随机稳定性(monkey)** — 随机触摸/滑动/按键/启动应用，监控崩溃计数和内存

## 系统应用 appid 映射

| 应用 | appid |
|------|-------|
| 有道词典 | 8080252464522508 |
| 提笔即扫OCR | 8001733883553973 |
| AI拍照 | 8001699004677776 |
| 录音服务 | 8001670668055425 |
| 小P老师 | 8001707294117702 |
| 设置 | 8080272425914438 |

完整列表见 `scripts/list-apps.sh`。

## 构建

```bash
npm install
npm run build:prod
adb push 8000000000182402.<版本>.amr /userdisk/Favorite/
adb shell "miniapp_cli install /userdisk/Favorite/8000000000182402.<版本>.amr"
adb shell "miniapp_cli start 8000000000182402"
```

## 目录结构

```
src/
  tester/
    runner.js        测试运行器
    actions.js       整机操作封装（execShell 驱动）
    cases/
      scan.js        扫描/相机测试
      dict.js        点查测试
      voice.js       语音问答测试
      monkey.js      随机稳定性测试
  pages/index/       测试菜单 + 结果 UI
  services/platform.js  execShell 等平台层
```

## 关键限制

- `execShell` 同步阻塞：长命令会卡 UI，测试运行中界面可能短暂无响应属正常
- `execShell` 无回显：命令产物需重定向到文件再读（见 actions.js 的 runCmd/memoryInfo）
- 触摸坐标：X 0–279, Y 0–935（竖屏 origin 左上）

## License

MIT
