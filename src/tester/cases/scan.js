// 扫描/相机测试：启动 OCR 扫描和 AI 拍照应用，触发相机键，验证不崩溃、能出画面。

import { startApp, scan, screenshot, memoryInfo, crashCount, goHome, SYSTEM_APPS } from '../actions.js'
import { sleep } from '../../services/platform.js'

export function register(tr) {
  tr.test('扫描：启动提笔即扫OCR', async (t) => {
    const before = await crashCount()
    startApp(SYSTEM_APPS.ocrScan)
    await sleep(2500)
    const shot = screenshot('scan_ocr')
    t.ok(shot.length > 0, '应能截图')
    const after = await crashCount()
    t.ok(after === before, '启动扫描不应增加崩溃计数')
    goHome()
    await sleep(1000)
  })

  tr.test('扫描：触发相机键', async (t) => {
    const before = await crashCount()
    scan()
    await sleep(2000)
    screenshot('scan_camera')
    const after = await crashCount()
    t.ok(after === before, '触发相机键不应崩溃')
    goHome()
    await sleep(1000)
  })

  tr.test('拍照：启动AI拍照', async (t) => {
    const before = await crashCount()
    startApp(SYSTEM_APPS.aiPhoto)
    await sleep(2500)
    screenshot('ai_photo')
    const after = await crashCount()
    t.ok(after === before, '启动AI拍照不应崩溃')
    goHome()
    await sleep(1000)
  })

  tr.test('扫描后内存可读', async (t) => {
    startApp(SYSTEM_APPS.ocrScan)
    await sleep(2000)
    const mem = await memoryInfo()
    t.ok(mem && mem.fordblks > 0, '应能读到内存空闲块')
    goHome()
    await sleep(1000)
  })
}
