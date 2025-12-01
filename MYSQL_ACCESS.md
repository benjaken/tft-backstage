# MySQL 访问指南

## 方法 1: 使用 MySQL 命令行客户端

### Windows 系统

如果 MySQL 已安装，通常可以通过以下方式进入：

1. **如果 MySQL 在系统 PATH 中：**
   ```bash
   mysql -u root -p
   ```

2. **如果 MySQL 不在 PATH 中，需要找到 MySQL 安装目录：**
   ```bash
   # 常见安装路径
   C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe -u root -p
   # 或
   C:\xampp\mysql\bin\mysql.exe -u root -p
   # 或
   C:\wamp64\bin\mysql\mysql8.0.xx\bin\mysql.exe -u root -p
   ```

3. **使用完整路径（根据你的实际安装路径调整）：**
   ```bash
   "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p
   ```

### 参数说明：
- `-u root`: 指定用户名（root 是默认管理员用户）
- `-p`: 提示输入密码（输入密码时不会显示字符）

## 方法 2: 使用 MySQL Workbench（图形界面）

1. 打开 MySQL Workbench
2. 点击 "Local instance MySQL" 或创建新连接
3. 输入用户名和密码
4. 点击连接

## 方法 3: 使用其他图形工具

- **phpMyAdmin** (如果使用 XAMPP/WAMP)
- **Navicat**
- **DBeaver**
- **HeidiSQL**

## 方法 4: 检查 MySQL 服务是否运行

在 Windows 上检查 MySQL 服务：

```bash
# 在 PowerShell 或 CMD 中运行
net start | findstr MySQL
# 或
sc query MySQL80
```

如果服务未运行，启动它：
```bash
net start MySQL80
# 或
net start MySQL
```

## 创建数据库

进入 MySQL 后，执行以下命令创建数据库：

```sql
CREATE DATABASE tftactics CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SHOW DATABASES;
USE tftactics;
```

## 常见问题

### 1. 找不到 mysql 命令
- 检查 MySQL 是否已安装
- 将 MySQL bin 目录添加到系统 PATH
- 或使用完整路径

### 2. 忘记 root 密码
- 参考 MySQL 官方文档重置密码
- 或使用 MySQL Workbench 的密码重置功能

### 3. 连接被拒绝
- 检查 MySQL 服务是否运行
- 检查防火墙设置
- 确认端口 3306 是否被占用

## 快速测试连接

如果 MySQL 已安装并运行，可以尝试：

```bash
# 尝试连接（不输入密码，直接回车）
mysql -u root

# 或指定密码
mysql -u root -p你的密码
```


