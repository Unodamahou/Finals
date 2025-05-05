-- 使用已有数据库
USE team_collaboration;

-- 修改task_comments表，添加user_id字段
ALTER TABLE task_comments 
ADD COLUMN user_id INT NOT NULL AFTER task_id,
ADD FOREIGN KEY (user_id) REFERENCES users(id);

-- 提示完成
SELECT 'Task comments table updated successfully.' AS message;