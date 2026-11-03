// 点查测试：启动有道词典，验证查词链路（启动→扫描→结果展示）。

import { startApp, scan, screenshot, crashCount, goHome, SYSTEM_APPS } from '../actions.js'
import { sleep } from '../../services/platform.js'

export function register(tr) {
  tr.test('点查：启动有道词典', async (t) => {
    const before = await crashCount()
    startApp(SYSTEM_APPS.dict)
    await sleep(2500)
    screenshot('dict_open')
    const after = await crashCount()
    t.ok(after === before, '启动词典不应崩溃')
    goHome()
    await sleep(1000)
  })

  tr.test('点查：触发扫描查词', async (t) => {
    const before = await crashCount()
    startApp(SYSTEM_APPS.dict)
    await sleep(1500)
    scan() // 触发扫描
    await sleep(2500)
    screenshot('dict_scan')
    const after = await crashCount()
    t.ok(after === before, '扫描查词不应崩溃')
    goHome()
    await sleep(1000)
  })

  tr.test('点查：反复进出词典', async (t) => {
    const before = await crashCount()
    for (let i = 0; i < 3; i++) {
      startApp(SYSTEM_APPS.dict)
      await sleep(1200)
      goHome()
      await sleep(800)
    }
    const after = await crashCount()
    t.ok(after === before, '反复进出词典不应崩溃')
    goHome()
    await sleep(1000)
  })
}
