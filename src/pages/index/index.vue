<template>
    <div class="pl-page">

        <!-- 顶栏 -->
        <div class="pl-top">
            <text class="pl-title">词典笔测试实验室</text>
            <text class="pl-version">v{{ version }}</text>
        </div>

        <!-- 测试项：大按钮网格 -->
        <div class="pl-body">
            <div class="pl-grid">
                <div v-for="(m, mi) in menuItems" :key="m.key" :class="menuClass(m)" @click="runMenu(m)">
                    <text :class="menuTxtClass(m)">{{ m.label }}</text>
                </div>
            </div>

            <!-- 工具入口：大按钮 -->
            <div class="pl-tools">
                <div class="pl-tool" @click="openPage('device')"><text class="pl-tooltxt">设备信息</text></div>
                <div class="pl-tool" @click="openPage('hwtest')"><text class="pl-tooltxt">硬件测试</text></div>
                <div class="pl-tool" @click="openPage('chart')"><text class="pl-tooltxt">趋势图表</text></div>
                <div class="pl-tool" @click="openPage('logs')"><text class="pl-tooltxt">日志查看</text></div>
            </div>
        </div>

        <!-- 底部：状态 + 操作 -->
        <div class="pl-foot">
            <text class="pl-status">{{ statusText }}</text>
            <div v-if="running" class="pl-stop" @click="stopAll"><text class="pl-stoptxt">停止</text></div>
            <div v-else class="pl-clear" @click="clearResults"><text class="pl-cleartxt">清空</text></div>
        </div>

    </div>
</template>

<script>
import { APP_VERSION } from '../../lib/appversion.js'
import { log } from '../../services/platform.js'
import { sleep } from '../../services/platform.js'
import { ensureScripts, startTest, stopTest, monkeyRunning, grafanaRunning } from '../../tester/actions.js'

export default {
    name: 'index',
    data() {
        return {
            version: APP_VERSION,
            running: false,
            stopFlag: false,
            statusMsg: '',
            currentLabel: '',
            menuItems: [
                { key: 'monkey', label: '随机稳定性', mode: '' },
                { key: 'dict', label: '点查', mode: 'dict' },
                { key: 'photo', label: '拍照', mode: 'rand' },
                { key: 'scan', label: '扫描', mode: 'ocr' },
                { key: 'voice', label: '语音问答', mode: 'xiaop' },
                { key: 'sleepwake', label: '休眠唤醒', mode: 'sleepwake' },
                { key: 'keys', label: '按键专项', mode: 'keys' }
            ]
        }
    },
    computed: {
        statusText() {
            if (this.running) return '正在运行：' + this.currentLabel + '（点「停止」结束）'
            return this.statusMsg || '选择上方测试项开始'
        }
    },
    mounted() {
        log('pen-lab mounted')
    },
    methods: {
        menuClass(m) {
            return this.running ? 'pl-item pl-item-off' : 'pl-item'
        },
        menuTxtClass(m) {
            return this.running ? 'pl-itemtxt-off' : 'pl-itemtxt'
        },
        async runMenu(m) {
            if (this.running) return
            this.running = true
            this.stopFlag = false
            this.statusMsg = ''
            this.currentLabel = m.label

            await this.runScriptTest(m)
            this.running = false
        },
        async runScriptTest(m) {
            const label = m.label
            const mode = m.mode || ''

            const landed = await ensureScripts()
            if (!landed) {
                this.statusMsg = '脚本落地失败'
                return
            }

            startTest(mode)
            await sleep(1500)
            const monkey = await monkeyRunning()
            const grafana = await grafanaRunning()
            this.statusMsg = 'monkey ' + (monkey ? '✓' : '✗') + ' · grafana ' + (grafana ? '✓' : '✗')

            log(label + '测试运行中，等待停止')
            while (!this.stopFlag) {
                await sleep(1000)
            }

            stopTest()
            await sleep(1000)
            const mStopped = !(await monkeyRunning())
            const gStopped = !(await grafanaRunning())
            this.statusMsg = '已停止：monkey ' + (mStopped ? '✓' : '✗') + ' · grafana ' + (gStopped ? '✓' : '✗')
            log(label + '测试已停止')
        },
        async stopAll() {
            this.stopFlag = true
            stopTest()
            log('用户请求停止测试')
        },
        clearResults() {
            this.statusMsg = ''
        },
        openPage(page) {
            try { $falcon.navTo(page, {}) } catch (e) { log('navTo ' + page + ' 失败') }
        }
    }
}
</script>

<style>
.pl-page {
    width: 936px;
    height: 280px;
    flex-direction: column;
    background-color: #16161a;
    position: relative;
}

.pl-top {
    height: 44px;
    flex-direction: row;
    align-items: center;
    padding-left: 16px;
    padding-right: 16px;
    background-color: #1e1e24;
}

.pl-title {
    font-size: 19px;
    color: #e8e8ee;
    flex: 1;
}

.pl-version {
    font-size: 14px;
    color: #6a6a78;
}

.pl-body {
    flex: 1;
    flex-direction: column;
    padding-left: 16px;
    padding-right: 16px;
    padding-top: 14px;
}

/* 测试项：7 个大按钮，两行排列 */
.pl-grid {
    flex-direction: row;
    flex-wrap: wrap;
}

.pl-item {
    flex-direction: row;
    align-items: center;
    justify-content: center;
    width: 220px;
    height: 52px;
    border-radius: 10px;
    background-color: #2f5c8a;
    margin-right: 8px;
    margin-bottom: 8px;
}

.pl-item-off {
    flex-direction: row;
    align-items: center;
    justify-content: center;
    width: 220px;
    height: 52px;
    border-radius: 10px;
    background-color: #2a2a33;
    margin-right: 8px;
    margin-bottom: 8px;
}

.pl-itemtxt {
    font-size: 17px;
    color: #ffffff;
}

.pl-itemtxt-off {
    font-size: 17px;
    color: #6a6a78;
}

/* 工具入口：4 个大按钮一排 */
.pl-tools {
    flex-direction: row;
    justify-content: space-between;
    margin-top: 8px;
}

.pl-tool {
    flex-direction: row;
    align-items: center;
    justify-content: center;
    width: 210px;
    height: 46px;
    border-radius: 10px;
    background-color: #3a3a46;
}

.pl-tooltxt {
    font-size: 16px;
    color: #d8d8e0;
}

.pl-foot {
    height: 48px;
    flex-direction: row;
    align-items: center;
    padding-left: 16px;
    padding-right: 16px;
    background-color: #1e1e24;
}

.pl-status {
    font-size: 15px;
    color: #9a9aa8;
    flex: 1;
}

.pl-stop {
    flex-direction: row;
    align-items: center;
    justify-content: center;
    width: 100px;
    height: 34px;
    border-radius: 8px;
    background-color: #c05050;
}

.pl-stoptxt {
    font-size: 16px;
    color: #ffffff;
}

.pl-clear {
    flex-direction: row;
    align-items: center;
    justify-content: center;
    width: 100px;
    height: 34px;
    border-radius: 8px;
    background-color: #2a2a33;
}

.pl-cleartxt {
    font-size: 16px;
    color: #9a9aa8;
}
</style>
