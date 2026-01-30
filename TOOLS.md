# TOOLS.md - 源码专家工具备忘

## 源码目录结构

工作目录 `/workspace` 即 Clawdbot 项目源码根目录。

关键目录：
- `src/` — 核心源码
- `docs/` — 文档
- `skills/` — 内置技能
- `extensions/` — 扩展
- `apps/` — 应用相关
- `test/` — 测试
- `scripts/` — 构建脚本

## 常用查阅方式

```bash
# 搜索源码
grep -rn "关键词" src/
# 查看目录结构
find src/ -name "*.ts" | head -50
# 查看 package.json 了解依赖
cat package.json
```
