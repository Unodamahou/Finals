-- 使用已有数据库
USE team_collaboration;

-- 修改tasks表，添加completed和completed_at字段
ALTER TABLE tasks 
ADD COLUMN completed BOOLEAN DEFAULT FALSE AFTER status,
ADD COLUMN completed_at TIMESTAMP NULL DEFAULT NULL AFTER completed;

-- 提示完成
SELECT 'Tasks table updated successfully.' AS message;