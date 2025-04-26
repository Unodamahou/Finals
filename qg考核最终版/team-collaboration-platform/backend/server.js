require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const WebSocket = require('ws');

const app = express();
const port = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 数据库连接配置
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

// 创建数据库连接池
const pool = mysql.createPool(dbConfig);

// 验证JWT中间件
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: '未提供认证令牌' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: '无效的认证令牌' });
        }
        req.user = user;
        next();
    });
};

// 用户注册
app.post('/api/register', async (req, res) => {
    try {
        const { email, password, username } = req.body;

        // 验证邮箱格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: '无效的邮箱格式' });
        }

        // 检查邮箱是否已存在
        const [existingUsers] = await pool.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ error: '该邮箱已被注册' });
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 10);

        // 创建用户
        const [result] = await pool.execute(
            'INSERT INTO users (email, password, username) VALUES (?, ?, ?)',
            [email, hashedPassword, username]
        );

        res.status(201).json({
            message: '注册成功',
            user: {
                id: result.insertId,
                email,
                username
            }
        });
    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 用户登录
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // 查找用户
        const [users] = await pool.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: '邮箱或密码错误' });
        }

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ error: '邮箱或密码错误' });
        }

        // 生成JWT令牌
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                username: user.username,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 获取用户信息
app.get('/api/user', authenticateToken, async (req, res) => {
    try {
        const [users] = await pool.execute(
            'SELECT id, email, username, role, created_at FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: '用户不存在' });
        }

        res.json(users[0]);
    } catch (error) {
        console.error('获取用户信息错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 获取所有团队成员
app.get('/api/members', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM members');
        res.json(rows);
    } catch (error) {
        console.error('获取成员错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 添加团队成员
app.post('/api/members', authenticateToken, async (req, res) => {
    try {
        const { name, gender, age } = req.body;

        // 将性别代码转换为枚举值
        let genderValue;
        if (gender === '1' || gender === 1) {
            genderValue = '男';
        } else if (gender === '2' || gender === 2) {
            genderValue = '女';
        } else {
            return res.status(400).json({ error: '性别必须是1(男)或2(女)' });
        }

        // 验证并转换年龄为整数
        const ageNum = parseInt(age, 10);
        if (isNaN(ageNum) || ageNum <= 0) {
            return res.status(400).json({ error: '年龄必须是正整数' });
        }

        const [result] = await pool.execute(
            'INSERT INTO members (name, gender, age) VALUES (?, ?, ?)',
            [name, genderValue, ageNum]
        );

        res.status(201).json({
            id: result.insertId,
            name,
            gender: genderValue, // 返回转换后的性别值
            age: ageNum
        });
    } catch (error) {
        console.error('添加成员错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 获取所有小组
app.get('/api/groups', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM team_groups');
        res.json(rows);
    } catch (error) {
        console.error('获取小组错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 创建小组
app.post('/api/groups', authenticateToken, async (req, res) => {
    try {
        const { name, description, leader_id } = req.body;
        const [result] = await pool.execute(
            'INSERT INTO team_groups (name, description, leader_id) VALUES (?, ?, ?)',
            [name, description, leader_id]
        );
        res.status(201).json({ id: result.insertId, name, description, leader_id });
    } catch (error) {
        console.error('创建小组错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 获取所有任务
app.get('/api/tasks', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM tasks');
        res.json(rows);
    } catch (error) {
        console.error('获取任务错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 创建任务
app.post('/api/tasks', authenticateToken, async (req, res) => {
    try {
        const { title, description, group_id, progress, prerequisites } = req.body;

        // 创建任务记录
        const [result] = await pool.execute(
            'INSERT INTO tasks (title, description, group_id, progress, status) VALUES (?, ?, ?, ?, ?)',
            [title, description, group_id, progress || 0, '待处理']
        );

        const taskId = result.insertId;

        // 如果有前置依赖，添加到任务依赖表
        if (prerequisites && prerequisites.length > 0) {
            for (const prerequisiteId of prerequisites) {
                await pool.execute(
                    'INSERT INTO task_dependencies (task_id, prerequisite_id) VALUES (?, ?)',
                    [taskId, prerequisiteId]
                );
            }
        }

        res.status(201).json({
            id: taskId,
            title,
            description,
            group_id,
            progress: progress || 0,
            status: '待处理',
            prerequisites: prerequisites || []
        });
    } catch (error) {
        console.error('创建任务错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 更新任务进度
app.put('/api/tasks/:id/progress', authenticateToken, async (req, res) => {
    try {
        const taskId = req.params.id;
        const { progress } = req.body;

        if (progress < 0 || progress > 100) {
            return res.status(400).json({ error: '进度必须在0-100之间' });
        }

        // 检查任务是否存在
        const [tasks] = await pool.execute('SELECT * FROM tasks WHERE id = ?', [taskId]);
        if (tasks.length === 0) {
            return res.status(404).json({ error: '任务不存在' });
        }

        // 确定任务状态
        let status = '进行中';
        if (progress === 0) {
            status = '待处理';
        } else if (progress === 100) {
            status = '已完成';
        }

        // 更新任务进度和状态
        await pool.execute(
            'UPDATE tasks SET progress = ?, status = ?, updated_at = NOW() WHERE id = ?',
            [progress, status, taskId]
        );

        // 如果进度为100%，自动更新任务状态为已完成
        if (progress === 100) {
            await pool.execute(
                'UPDATE tasks SET completed = 1, completed_at = NOW() WHERE id = ?',
                [taskId]
            );
        }

        res.json({
            id: parseInt(taskId),
            progress,
            status,
            message: '任务进度已更新'
        });
    } catch (error) {
        console.error('更新任务进度错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 完成任务
app.put('/api/tasks/:id/complete', authenticateToken, async (req, res) => {
    try {
        const taskId = req.params.id;

        // 检查任务是否存在
        const [tasks] = await pool.execute('SELECT * FROM tasks WHERE id = ?', [taskId]);
        if (tasks.length === 0) {
            return res.status(404).json({ error: '任务不存在' });
        }

        // 更新任务为已完成
        await pool.execute(
            'UPDATE tasks SET completed = 1, progress = 100, status = ?, completed_at = NOW(), updated_at = NOW() WHERE id = ?',
            ['已完成', taskId]
        );

        res.json({
            id: parseInt(taskId),
            message: '任务已标记为完成',
            status: '已完成'
        });
    } catch (error) {
        console.error('完成任务错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 重新打开任务
app.put('/api/tasks/:id/reopen', authenticateToken, async (req, res) => {
    try {
        const taskId = req.params.id;

        // 检查任务是否存在
        const [tasks] = await pool.execute('SELECT * FROM tasks WHERE id = ?', [taskId]);
        if (tasks.length === 0) {
            return res.status(404).json({ error: '任务不存在' });
        }

        // 更新任务为未完成
        await pool.execute(
            'UPDATE tasks SET completed = 0, status = ?, completed_at = NULL, updated_at = NOW() WHERE id = ?',
            ['进行中', taskId]
        );

        res.json({
            id: parseInt(taskId),
            message: '任务已重新打开',
            status: '进行中'
        });
    } catch (error) {
        console.error('重新打开任务错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 获取任务依赖关系
app.get('/api/tasks/:id/dependencies', authenticateToken, async (req, res) => {
    try {
        const taskId = req.params.id;

        // 获取前置依赖
        const [prerequisites] = await pool.execute(
            'SELECT prerequisite_id FROM task_dependencies WHERE task_id = ?',
            [taskId]
        );

        // 获取后置依赖
        const [dependents] = await pool.execute(
            'SELECT task_id FROM task_dependencies WHERE prerequisite_id = ?',
            [taskId]
        );

        res.json({
            prerequisites: prerequisites.map(p => p.prerequisite_id),
            dependents: dependents.map(d => d.task_id)
        });
    } catch (error) {
        console.error('获取任务依赖关系错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 更新小组成员
app.post('/api/groups/:id/members', authenticateToken, async (req, res) => {
    try {
        const groupId = req.params.id;
        const { memberIds } = req.body;

        // 检查小组是否存在
        const [groups] = await pool.execute('SELECT * FROM team_groups WHERE id = ?', [groupId]);
        if (groups.length === 0) {
            return res.status(404).json({ error: '小组不存在' });
        }

        // 删除旧的成员关联
        await pool.execute('DELETE FROM group_members WHERE group_id = ?', [groupId]);

        // 添加新的成员关联
        if (memberIds && memberIds.length > 0) {
            for (const memberId of memberIds) {
                await pool.execute(
                    'INSERT INTO group_members (group_id, member_id) VALUES (?, ?)',
                    [groupId, memberId]
                );
            }
        }

        res.json({
            id: parseInt(groupId),
            message: '小组成员已更新'
        });
    } catch (error) {
        console.error('更新小组成员错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 添加任务评论
app.post('/api/tasks/:id/comments', authenticateToken, async (req, res) => {
    try {
        const taskId = req.params.id;
        const { content } = req.body;

        // 检查任务是否存在
        const [tasks] = await pool.execute('SELECT * FROM tasks WHERE id = ?', [taskId]);
        if (tasks.length === 0) {
            return res.status(404).json({ error: '任务不存在' });
        }

        // 添加评论
        const [result] = await pool.execute(
            'INSERT INTO task_comments (task_id, user_id, content) VALUES (?, ?, ?)',
            [taskId, req.user.id, content]
        );

        res.status(201).json({
            id: result.insertId,
            task_id: parseInt(taskId),
            user_id: req.user.id,
            content,
            created_at: new Date()
        });
    } catch (error) {
        console.error('添加评论错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 获取任务评论
app.get('/api/tasks/:id/comments', authenticateToken, async (req, res) => {
    try {
        const taskId = req.params.id;

        // 获取任务评论
        const [comments] = await pool.execute(
            'SELECT c.*, u.username FROM task_comments c JOIN users u ON c.user_id = u.id WHERE c.task_id = ? ORDER BY c.created_at',
            [taskId]
        );

        res.json(comments);
    } catch (error) {
        console.error('获取任务评论错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 获取通知
app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        // 获取用户通知
        const [notifications] = await pool.execute(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
            [req.user.id]
        );

        res.json(notifications);
    } catch (error) {
        console.error('获取通知错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 创建通知
app.post('/api/notifications', authenticateToken, async (req, res) => {
    try {
        const { type, title, message, task_id } = req.body;

        // 创建通知
        const [result] = await pool.execute(
            'INSERT INTO notifications (user_id, type, title, message, task_id) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, type, title, message, task_id || null]
        );

        res.status(201).json({
            id: result.insertId,
            user_id: req.user.id,
            type,
            title,
            message,
            task_id: task_id || null,
            read: false,
            created_at: new Date().toISOString()
        });
    } catch (error) {
        console.error('创建通知错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 标记通知为已读
app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
    try {
        const notificationId = req.params.id;

        // 确保通知属于当前用户
        const [notifications] = await pool.execute(
            'SELECT * FROM notifications WHERE id = ? AND user_id = ?',
            [notificationId, req.user.id]
        );

        if (notifications.length === 0) {
            return res.status(404).json({ error: '通知不存在或不属于当前用户' });
        }

        // 更新通知状态
        await pool.execute(
            'UPDATE notifications SET `read` = TRUE WHERE id = ?',
            [notificationId]
        );

        res.json({
            id: parseInt(notificationId),
            message: '通知已标记为已读'
        });
    } catch (error) {
        console.error('标记通知错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 标记所有通知为已读
app.put('/api/notifications/read-all', authenticateToken, async (req, res) => {
    try {
        // 更新所有通知状态
        await pool.execute(
            'UPDATE notifications SET `read` = TRUE WHERE user_id = ? AND `read` = FALSE',
            [req.user.id]
        );

        res.json({
            message: '所有通知已标记为已读'
        });
    } catch (error) {
        console.error('标记所有通知错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 测试路由
app.get('/test-db', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT 1');
        res.status(200).send('数据库连接成功');
    } catch (error) {
        console.error('数据库连接失败:', error);
        res.status(500).send('数据库连接失败');
    }
});

// 启动服务器
app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
});

// 创建 WebSocket 服务器
const wss = new WebSocket.Server({ port: 3002 });

wss.on('listening', () => {
    console.log('WebSocket 服务运行在 ws://localhost:3002');
});
wss.on('connection', (ws) => {
    console.log('客户端已连接');

    ws.on('message', (message) => {
        console.log('收到客户端消息:', message);
    });

    ws.on('close', () => {
        console.log('客户端已断开');
    });
});
