// 语音问答测试：启动小P老师/录音服务，触发语音键，验证语音链路不崩溃。

import { startApp, pressKey, screenshot, crashCount, goHome, SYSTEM_APPS } from '../actions.js'
import { sleep } from '../../services/platform.js'

export function register(tr) {
  tr.test('语音：启动小P老师', async (t) => {
    const before = await crashCount()
    startApp(SYSTEM_APPS.aiTeacher)
    await sleep(2500)
    screenshot('voice_teacher')
    const after = await crashCount()
    t.ok(after === before, '启动小P老师不应崩溃')
    goHome()
    await sleep(1000)
  })

  tr.test('语音：启动录音服务', async (t) => {
    const before = await crashCount()
    startApp(SYSTEM_APPS.recorder)
    await sleep(2500)
    screenshot('voice_recorder')
    const after = await crashCount()
    t.ok(after === before, '启动录音服务不应崩溃')
    goHome()
    await sleep(1000)
  })

  tr.test('语音：触发语音键（asr）', async (t) => {
    const before = await crashCount()
    pressKey('asr')
    await sleep(1500)
    screenshot('voice_asr')
    const after = await crashCount()
    t.ok(after === before, '触发语音键不应崩溃')
    goHome()
    await sleep(1000)
  })
}
