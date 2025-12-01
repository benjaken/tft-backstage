# 设置 pnpm PATH 环境变量

## 问题
pnpm 提示：`The configured global bin directory "C:/Users/neroc/.local/share/pnpm" is not in PATH`

## 解决方案

### 方法 1：在 Windows 系统设置中添加（推荐，永久生效）

1. **打开环境变量设置：**
   - 按 `Win + R`
   - 输入 `sysdm.cpl`，回车
   - 点击"高级"选项卡
   - 点击"环境变量"按钮

2. **添加用户变量：**
   - 在"用户变量"部分，点击"新建"
   - 变量名：`PNPM_HOME`
   - 变量值：`C:\Users\neroc\.local\share\pnpm`
   - 点击"确定"

3. **修改 PATH 变量：**
   - 在"用户变量"中找到 `Path` 变量
   - 点击"编辑"
   - 点击"新建"
   - 添加：`%PNPM_HOME%`
   - 或者直接添加：`C:\Users\neroc\.local\share\pnpm`
   - 点击"确定"保存所有更改

4. **重启终端：**
   - 关闭所有终端窗口
   - 重新打开终端
   - 运行 `pnpm --version` 验证

### 方法 2：在 Git Bash 中临时设置（仅当前会话有效）

在每次打开 Git Bash 时运行：
```bash
export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"
```

### 方法 3：创建 Git Bash 配置文件（自动设置）

1. 在用户主目录创建或编辑 `.bashrc` 文件：
   ```bash
   echo 'export PNPM_HOME="$HOME/.local/share/pnpm"' >> ~/.bashrc
   echo 'export PATH="$PNPM_HOME:$PATH"' >> ~/.bashrc
   ```

2. 重新打开 Git Bash，配置会自动加载

### 方法 4：使用 PowerShell 设置（管理员权限）

在 PowerShell（管理员）中运行：
```powershell
[Environment]::SetEnvironmentVariable("PNPM_HOME", "$env:USERPROFILE\.local\share\pnpm", "User")
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
[Environment]::SetEnvironmentVariable("Path", "$currentPath;$env:USERPROFILE\.local\share\pnpm", "User")
```

然后重启终端。

## 验证设置

运行以下命令验证：
```bash
echo $PNPM_HOME
pnpm --version
```

如果都正常，说明设置成功。

## 注意事项

- 修改环境变量后需要**重启终端**才能生效
- 如果使用 VS Code 的集成终端，也需要重启 VS Code
- 确保路径使用正确的斜杠（Windows 使用反斜杠 `\`，但在 Git Bash 中可以使用正斜杠 `/`）


