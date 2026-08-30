# Codex Context Recovery Protocol

**Version:** v1
**Established:** 2026-08-30
**Scope:** 耗材库项目控制文档；不改变业务代码、数据或部署。

## 1. 正常任务启动

启动新任务时只读取与当前任务直接相关的最小上下文：

- `PROJECT_BASELINE.md` 的相关章节
- `CURRENT_TASK_CHECKPOINT.md`
- `PROJECT_OPERATION_LOG.md` 最近相关尾部
- `CHANGE_HISTORY.md` 最近相关尾部
- `git status`

禁止默认全文读取 `PROJECT_OPERATION_LOG.md` 或 `CHANGE_HISTORY.md`。只有确实需要确认某个历史事实时，才定位读取相关部分。

## 2. 上下文压缩/恢复

恢复后按以下顺序执行：

1. 读取 `git status`。
2. 读取 `CURRENT_TASK_CHECKPOINT.md`。
3. 检查其中 `FILES_TOUCHED` 指定的当前任务文件。
4. 从 `NEXT_STEP` 继续。

不得重新开始任务，也不得重新执行已经记录为完成的审计或读取。仅在必要时读取 baseline 的局部内容。恢复不授权继续任何此前暂停的业务任务。

每次发生上下文恢复，将 `CONTEXT_RECOVERY_COUNT` 加 1，并立即更新 `LAST_UPDATED_AT`。

## 3. 防循环

若 `CONTEXT_RECOVERY_COUNT >= 2` 且 `LAST_COMPLETED_STEP` 没有新增，立即停止并在检查点标记：

```text
CONTEXT_RECOVERY_LOOP=YES
```

不得通过重复读取、重复审计或扩大范围来绕过该停止条件。

## 4. 无进展停止

若约 15 分钟没有形成新的有意义完成步骤，停止继续扩张任务，记录 blocker、更新检查点并返回。不要以重复检查或无关重构制造进展。

## 5. 历史日志规则

`PROJECT_OPERATION_LOG.md` 与 `CHANGE_HISTORY.md` 是 append-only 历史。不得删除、截断、重写或覆盖旧记录。新记录只能追加；查历史时只定位相关尾部或相关条目。

## 6. 已冻结能力

上下文恢复不得触发对已经冻结功能的重新审计或重新设计，除非出现新的具体证据或真实 blocker。尤其不得因恢复流程重新审计、实现或推进 canonical mapper 业务任务。

## 7. 本次暂停任务登记

`Implement Minimal Shared Canonical Mapper + Read-Only Parameter Detail Projection` 已记录为 `PAUSED_CONTEXT_OVERLOAD`。本协议建立不恢复该任务；只有新协议生效后、由明确的新任务授权，才可重新评估其恢复。

## 8. 当前检查点约定

`CURRENT_TASK_CHECKPOINT.md` 是小型、可覆盖更新的当前任务恢复文件，目标约 5 KB 内。它只保存当前状态，不保存完整历史。每完成一个有意义步骤立即更新；任务完成或停止时写明 `TASK_STATUS`、`NEXT_STEP`、`BLOCKERS` 与验证状态。
