---
name: claude-web-terminal
description: "Claude Web Terminal (AI Workspace OS) 项目运维 - 部署、状态、重启、日志。腾讯云 :3100，workspace.asterforge.top，systemd 服务。"
---

# claude-web-terminal

Claude Web Terminal（AI Workspace OS）项目运维：部署、状态、重启、日志。Git 是 source of truth。

## 执行协议

1. deploy 前确认本地代码已 commit 且与 origin 一致。
2. 命令失败时停止，不得宣称完成。用户没明确要求时不主动跑检查命令。

## 关键信息速查

| 项目 | 值 |
|------|-----|
| 线上 | https://workspace.asterforge.top |
| 服务器 | ubuntu@111.229.200.178（腾讯云）|
| SSH 密钥 | `~/Desktop/my_workspace/asterforge-deploy/ssh-keys/tencent_server_key.pem` |
| 服务名 | claude-web-terminal（systemd）|
| 端口 | 3100 |
| 服务器路径 | /home/ubuntu/claude-web-terminal |

## 支持的操作

| 命令 | 行为 |
|------|------|
| `deploy` | 拉代码 -> 安装依赖 -> 构建 -> 重启服务 |
| `status` | SSH 检查 systemd 状态 + curl 健康检查 |
| `restart` | SSH 重启 claude-web-terminal 服务 |
| `logs` | SSH `journalctl -u claude-web-terminal` |

## 服务管理

```bash
# 状态 / 重启 / 日志
sudo systemctl status|restart claude-web-terminal
sudo journalctl -u claude-web-terminal --no-pager -n 50
sudo journalctl -u claude-web-terminal --no-pager -f  # 实时

# 健康检查
curl -s -o /dev/null -w '%{http_code}' https://workspace.asterforge.top  # 期望: 200
```

## 完成标准

deploy 成功判据：
- `systemctl is-active claude-web-terminal` = active
- `curl https://workspace.asterforge.top` 200

## 自动进化

会话中执行过非本 skill 的任务后，再次调用时进入进化模式。检测以下信号并更新对应段落：

| 信号 | 更新段落 | 动作 |
|------|---------|------|
| 服务端口/路径/密钥变化 | 关键信息速查 | 改表 |
| 新增故障 + 排查 | 新增故障排查段 | 追加 |
| 部署流程细化 | 支持的操作 / 服务管理 | 补具体命令 |
| 依赖 / 构建方式变更 | 支持的操作 -> deploy | 补 |

进化只改本 SKILL.md（单一真相源）。历史交给 git log，不建 DEVLOG。触发判断：会话执行过非本命令任务 -> 进化；只用过本命令 -> 不进化。
