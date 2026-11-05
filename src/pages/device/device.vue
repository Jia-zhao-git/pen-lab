<template>
    <div class="if-page">

        <div class="if-top">
            <div class="if-chip" @click="back"><text class="if-chiptxt">返回</text></div>
            <text class="if-title">设备信息</text>
            <div class="if-chip" @click="refresh"><text class="if-chiptxt">刷新</text></div>
        </div>

        <scroller class="if-scroll" scroll-direction="vertical">
            <div class="if-content">
                <text v-if="loading" class="if-empty">采集中…</text>

                <div v-else-if="info">
                    <text class="if-sec">设备标识</text>
                    <div class="if-row"><text class="if-k">SKU</text><text class="if-v">{{ info.sku }}</text></div>
                    <div class="if-row"><text class="if-k">序列号</text><text class="if-v">{{ info.sn }}</text></div>
                    <div class="if-row"><text class="if-k">固件版本</text><text class="if-v">{{ info.version }}</text></div>
                    <div class="if-row"><text class="if-k">运行时长</text><text class="if-v">{{ info.uptime }}</text></div>

                    <text class="if-sec">CPU</text>
                    <div class="if-row"><text class="if-k">型号</text><text class="if-v">{{ info.cpu.model }}</text></div>
                    <div class="if-row"><text class="if-k">架构</text><text class="if-v">{{ info.cpu.arch }} · {{ info.cpu.cores }}核</text></div>

                    <text class="if-sec">内存</text>
                    <div class="if-row"><text class="if-k">总内存</text><text class="if-v">{{ memText(info.mem.total) }}</text></div>
                    <div class="if-row"><text class="if-k">可用</text><text class="if-v">{{ memText(info.mem.available) }}</text></div>

                    <text class="if-sec">存储</text>
                    <div v-for="(s, si) in info.storage" :key="si" class="if-row">
                        <text class="if-k">{{ s.mount }}</text>
                        <text class="if-v">{{ memText(s.totalKb) }} · 已用 {{ s.usePercent }}</text>
                    </div>

                    <text class="if-sec">电池</text>
                    <div class="if-row"><text class="if-k">电量</text><text class="if-v">{{ info.battery.capacity }}%</text></div>
                    <div class="if-row"><text class="if-k">状态</text><text class="if-v">{{ info.battery.status }}（{{ info.battery.chargeType }}）</text></div>
                    <div class="if-row"><text class="if-k">温度</text><text class="if-v">{{ info.battery.temp }}℃</text></div>
                    <div class="if-row"><text class="if-k">电压</text><text class="if-v">{{ info.battery.voltage }}V</text></div>

                    <text class="if-sec">屏幕 / 输入</text>
                    <div class="if-row"><text class="if-k">亮度</text><text class="if-v">{{ info.brightness.current }} / {{ info.brightness.max }}</text></div>
                    <div class="if-row"><text class="if-k">触摸屏</text><text class="if-v">{{ info.touch }}</text></div>

                    <text class="if-sec">连接</text>
                    <div class="if-row"><text class="if-k">WiFi IP</text><text class="if-v">{{ info.net.ip }}</text></div>
                    <div class="if-row"><text class="if-k">蓝牙</text><text class="if-v">{{ info.bt.address }}（{{ info.bt.state }}）</text></div>

                    <text class="if-sec">其它</text>
                    <div class="if-row"><text class="if-k">崩溃计数</text><text class="if-v">{{ info.crash }}</text></div>
                    <div class="if-row"><text class="if-k">数据目录</text><text class="if-v">{{ info.dataDir }}</text></div>
                </div>
            </div>
        </scroller>

    </div>
</template>

<script>
import { collectDeviceInfo } from '../../services/sysinfo.js'
import { log } from '../../services/platform.js'

export default {
    name: 'device',
    data() {
        return {
            info: null,
            loading: false
        }
    },
    mounted() {
        log('device mounted')
        this.refresh()
    },
    methods: {
        async refresh() {
            this.loading = true
            this.info = null
            this.info = await collectDeviceInfo()
            this.loading = false
            log('info 采集完成')
        },
        memText(kb) {
            const n = Number(kb) || 0
            if (n >= 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + ' GB'
            if (n >= 1024) return (n / 1024).toFixed(0) + ' MB'
            return n + ' KB'
        },
        back() {
            try { $falcon.navTo('index', {}) } catch (e) { /* 忽略 */ }
        }
    }
}
</script>

<style>
.if-page {
    width: 936px;
    height: 280px;
    flex-direction: column;
    background-color: #16161a;
    position: relative;
}

.if-top {
    height: 40px;
    flex-direction: row;
    align-items: center;
    padding-left: 12px;
    padding-right: 12px;
    background-color: #1e1e24;
}

.if-chip {
    flex-direction: row;
    align-items: center;
    height: 26px;
    padding-left: 12px;
    padding-right: 12px;
    border-radius: 6px;
    background-color: #2a2a33;
    margin-right: 10px;
}

.if-chiptxt {
    font-size: 13px;
    color: #9a9aa8;
}

.if-title {
    font-size: 16px;
    color: #e8e8ee;
    flex: 1;
}

.if-scroll {
    flex: 1;
}

.if-content {
    padding-left: 16px;
    padding-right: 16px;
    padding-top: 8px;
    padding-bottom: 8px;
}

.if-sec {
    font-size: 13px;
    color: #4ade80;
    margin-top: 12px;
    margin-bottom: 4px;
}

.if-row {
    flex-direction: row;
    align-items: center;
    height: 28px;
    border-bottom-width: 1px;
    border-bottom-color: #26262e;
}

.if-k {
    font-size: 14px;
    color: #9a9aa8;
    width: 160px;
}

.if-v {
    font-size: 14px;
    color: #d8d8e0;
    flex: 1;
}

.if-empty {
    font-size: 15px;
    color: #6a6a78;
    margin: 20px;
}
</style>
