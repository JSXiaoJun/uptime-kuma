# 线路状态（Line Status）功能说明

这是基于 Uptime Kuma v2.4.0 的二次开发，新增了「线路带宽占用」监控。
它与原生的「监控项（Monitor）」完全独立，不会影响可用性监控、告警和状态页原有逻辑。

## 功能概览

- 在仪表盘「添加监控项」旁边新增 **「+ 添加线路」** 按钮，可自行增删改线路。
- 每条线路对接一个返回 JSON 的端点（例如 `https://hk1.yyapi.cloud/status.json`）。
- 线路显示为：`线路名  ● 线路畅通  [████░░░░░░] 12%`，颜色随占用率变化。
- 状态页（`/status/...`）中可像添加监控项一样，把线路挂到任意分组下展示给用户。

## 颜色与阈值

占用百分比对应的等级（`server/jobs/line-status.js` 中的 `deriveLevel()`）：

| 占用率    | loadLevel   | status      | 显示文案 | 颜色         |
| --------- | ----------- | ----------- | -------- | ------------ |
| < 50%     | `low`       | `normal`    | 线路畅通 | 绿 `#10b981` |
| 50% ~ 75% | `medium`    | `normal`    | 使用正常 | 黄 `#eab308` |
| 75% ~ 90% | `high`      | `busy`      | 线路较忙 | 橙 `#f97316` |
| >= 90%    | `saturated` | `congested` | 线路拥堵 | 红 `#ef4444` |
| 无数据    | `unknown`   | `unknown`   | 状态未知 | 灰 `#9ca3af` |

阈值集中在一处，想调整只需改 `deriveLevel()`。

## 端点返回格式

线路端点至少需要 `usage_percent`（0-100）。其余字段可省略，省略时由后端按上表推导：

```json
{
  "line": "hk1",
  "status": "normal",
  "load_level": "low",
  "usage_percent": 12,
  "capacity_label": "80 Mbps",
  "text": "线路畅通",
  "limited": false,
  "updated_at": "2026-10-22T14:46:24+08:00"
}
```

兼容 `usage_percent` / `usagePercent`、`load_level` / `loadLevel` 两种命名。

## 采样机制

- 调度器每分钟触发一次（`server/jobs.js` 中的 `line-status-poller`）。
- 每条线路按自己的 `interval_seconds` 决定是否该采样，因此**每条线路的间隔可独立设置**（最小 60 秒，默认 300 秒）。
- 采样结果写入 `line_status_sample`，同时把最新值镜像到 `line_status` 行上，列表读取无需聚合。
- 失败时写入 `last_error` 并在界面上标红，**保留上一次成功的数据**，避免短暂抖动导致状态闪烁。
- 样本保留 7 天，由 `pruneOldSamples()` 清理。

## 数据库

迁移文件：`db/knex_migrations/2026-10-22-0000-add-line-status.js`

三张表：

| 表                   | 用途                                           |
| -------------------- | ---------------------------------------------- |
| `line_status`        | 线路定义与最新状态快照                         |
| `line_status_sample` | 历史采样（用于画曲线、保留 7 天）              |
| `group_line`         | 线路与状态页分组的关联，等价于 `monitor_group` |

迁移是幂等的（使用 `hasTable` 守卫），并且提供 `down()` 回滚。

## 对外 API

`GET /api/line-status` —— 公开只读，只返回已挂在**公开状态页分组**下的启用线路：

```json
{
  "lines": [
    {
      "id": 1,
      "name": "hk1",
      "displayName": "HK1 香港线路",
      "loadLevel": "low",
      "status": "normal",
      "text": "线路畅通",
      "usagePercent": 12,
      "updatedAt": "2026-10-22 06:46:24"
    }
  ],
  "updatedAt": "2026-10-22T06:50:00.000Z"
}
```

注意：**不返回 `endpoint`**，避免中转机地址泄露给访客。

## Socket 事件

| 事件                   | 方向            | 说明                     |
| ---------------------- | --------------- | ------------------------ |
| `getLineStatusList`    | 客户端 → 服务端 | 获取全部线路（需登录）   |
| `addLineStatus`        | 客户端 → 服务端 | 新增线路，会立即探测一次 |
| `editLineStatus`       | 客户端 → 服务端 | 编辑线路                 |
| `deleteLineStatus`     | 客户端 → 服务端 | 删除线路及其历史         |
| `refreshLineStatus`    | 客户端 → 服务端 | 立即采样一次             |
| `getLineStatusHistory` | 客户端 → 服务端 | 取 N 小时样本（默认 24） |
| `lineStatusList`       | 服务端 → 客户端 | 线路列表推送             |

## 改动文件清单

**新增：**

```
db/knex_migrations/2026-10-22-0000-add-line-status.js
server/model/line-status.js
server/jobs/line-status.js
server/socket-handlers/line-status-socket-handler.js
src/components/LineStatusBar.vue
src/components/LineStatusList.vue
src/components/LineStatusDialog.vue
```

**修改：**

```
server/jobs.js                                       注册轮询任务
server/client.js                                     sendLineStatusList
server/server.js                                     注册 socket handler
server/model/status_page.js                          分组数据附带 lineList
server/routers/api-router.js                         GET /api/line-status
server/socket-handlers/status-page-socket-handler.js 保存分组的线路关联
src/pages/Dashboard.vue                              添加线路按钮与列表
src/pages/StatusPage.vue                             编辑时加载线路列表
src/components/PublicGroupList.vue                   分组内展示/添加线路
src/mixins/public.js                                 allLineStatusList 全局状态
src/mixins/socket.js                                 lineStatusList 事件
src/icon.js                                          注册 faNetworkWired
src/lang/{en,zh-CN,zh-TW}.json                       文案
```

## 构建与部署

### 方式一：推送后自动构建镜像（推荐）

`.github/workflows/build-custom-image.yml` 会在每次推送到 `master` 时自动：

1. `npm ci` 安装依赖
2. `npm run build` 编译前端
3. 校验 `dist/index.html` 与 `server/model/line_status.js` 存在
4. 用 `docker/dockerfile` 的 `release` 阶段构建镜像并推送到 GHCR

镜像地址：

```
ghcr.io/jsxiaojun/uptime-kuma:latest      # master 最新
ghcr.io/jsxiaojun/uptime-kuma:<short-sha> # 每次提交一个
```

服务器上更新只需：

```bash
docker pull ghcr.io/jsxiaojun/uptime-kuma:latest

docker stop uptime-kuma && docker rm uptime-kuma
docker run -d --name uptime-kuma \
  --restart unless-stopped \
  -p 3001:3001 \
  -v /opt/uptime-kuma/data:/app/data \
  ghcr.io/jsxiaojun/uptime-kuma:latest
```

> 注意：上方 `data` 路径按你的实际情况替换。**挂载必须保持一致，否则监控历史会丢失。**

GHCR 包默认是私有的，首次使用需要在服务器上登录：

```bash
echo <你的GitHub_PAT> | docker login ghcr.io -u <你的GitHub用户名> --password-stdin
```

PAT 需要勾选 `read:packages` 权限。也可以在 GitHub 仓库的
`Packages` 页面把包的可见性改成 public，这样就无需登录。

**为什么需要在 CI 里先编译前端**：`docker/dockerfile` 的 `build` 阶段只跑
`npm ci --omit=dev`，不含 devDependencies，因此镜像里不会有 `dist/`。
官方发布流程是在 GitHub Actions 中预先构建好 `dist.tar.gz` 再打包，
我们采用同样的思路。

### 方式二：本机源码运行

```bash
npm ci                 # 安装依赖
npm run build          # 构建前端，产物在 dist/
npm run start-server   # 启动（生产建议用 pm2 或 systemd）
```

升级已有实例时，启动后 migrations 会自动执行，无需手工建表。

### 常见坑

- **不要用面板的「升级容器」**：它只会拉取 `louislam/uptime-kuma`，会把自定义镜像覆盖回官方版。
- **直接 `docker build` 会得到没有前端界面的镜像**：必须先执行 `npm run build`。

## 快速自检

```bash
# 1. 端点可访问
curl -s https://hk1.yyapi.cloud/status.json

# 2. 公开 API（需先把线路加进公开分组）
curl -s https://你的kuma域名/api/line-status | head -20

# 3. 后端模块加载无误
node --check server/jobs/line-status.js

# 4. 镜像里确实带了前端与线路模块
docker run --rm --entrypoint sh ghcr.io/jsxiaojun/uptime-kuma:latest -c \
  "ls /app/dist/index.html && ls /app/server/model/line_status.js"
```

## 设计取舍

- **不复用 Monitor 表**：Monitor 的语义是 UP/DOWN 四态，而带宽占用是连续数值。
  混进去会污染心跳表、打乱告警判定，也让上游升级更难合并。
- **独立轮询而非 shell 脚本**：避免依赖额外部署的 cron 脚本，配置全部存在数据库里，便于多线路管理。
- **公开 API 脱敏**：只暴露百分比与文案，不暴露 endpoint、容量、原始带宽。
