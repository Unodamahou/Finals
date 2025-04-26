/**
 * 实时更新系统 - 使用WebSocket实现实时数据更新
 */

document.addEventListener('DOMContentLoaded', () => {
    // 获取DOM元素
    const realtimeStatus = document.getElementById('realtime-status');
    const statusIndicator = realtimeStatus.querySelector('.status-indicator');

    // WebSocket连接
    let socket = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const reconnectInterval = 3000; // 重连间隔时间（毫秒）

    // 实时数据存储
    const realtimeData = {
        tasks: [],
        groups: [],
        members: [],
        activeUsers: []
    };

    // 实时更新处理函数
    const realtimeHandlers = {
        // 任务更新处理
        taskUpdate: function (data) {
            const { taskId, action, payload, userId } = data;

            // 根据操作类型处理
            switch (action) {
                case 'create':
                    // 处理新任务创建
                    handleTaskCreated(payload);
                    break;
                case 'update':
                    // 处理任务更新
                    handleTaskUpdated(taskId, payload);
                    break;
                case 'progress':
                    // 处理任务进度更新
                    handleProgressUpdate(taskId, payload.progress, userId);
                    break;
                case 'comment':
                    // 处理新评论
                    handleNewComment(taskId, payload.comment, userId);
                    break;
                case 'branch':
                    // 处理分支创建
                    handleBranchCreated(taskId, payload.branch, userId);
                    break;
                case 'mergeRequest':
                    // 处理合并请求
                    handleMergeRequest(taskId, payload.mergeRequest, userId);
                    break;
                case 'delete':
                    // 处理任务删除
                    handleTaskDeleted(taskId);
                    break;
            }

            // 发送通知（仅当不是当前用户的操作时）
            if (userId !== getCurrentUserId()) {
                sendNotification(action, taskId, payload, userId);
            }
        },

        // 用户状态更新处理
        userStatus: function (data) {
            const { userId, status, username } = data;

            // 更新活跃用户列表
            if (status === 'online') {
                // 添加到活跃用户列表
                if (!realtimeData.activeUsers.includes(userId)) {
                    realtimeData.activeUsers.push(userId);
                }
            } else if (status === 'offline') {
                // 从活跃用户列表中移除
                realtimeData.activeUsers = realtimeData.activeUsers.filter(id => id !== userId);
            }

            // 更新UI上的在线用户状态（如果有这样的UI元素）
            updateOnlineUsersUI();
        },

        // 系统消息处理
        systemMessage: function (data) {
            const { message, type } = data;

            // 显示系统消息通知
            showSystemMessage(message, type);
        }
    };

    // 初始化WebSocket连接
    function initWebSocket() {
        updateConnectionStatus('connecting');

        // 在生产环境中，这里应该是服务器的WebSocket地址
        // 这里我们使用模拟的方式，适合开发环境测试
        mockWebSocketConnection();
    }

    // 模拟WebSocket连接（开发/演示用）
    function mockWebSocketConnection() {
        console.log('正在模拟WebSocket连接...');

        // 模拟连接延迟
        setTimeout(() => {
            // 模拟连接成功
            updateConnectionStatus('online');
            reconnectAttempts = 0;

            // 设置模拟事件监听器
            setupMockEventListeners();

            // 通知用户
            if (window.notificationSystem) {
                window.notificationSystem.addNotification(
                    'system',
                    '连接成功',
                    '实时更新系统已连接，您将会收到实时通知。',
                    null
                );
            }
        }, 1500);
    }

    // 模拟WebSocket连接失败
    function mockConnectionFailure() {
        updateConnectionStatus('offline');

        // 尝试重新连接
        handleReconnect();
    }

    // 设置模拟事件监听器
    function setupMockEventListeners() {
        // 不再使用定时器模拟随机消息
        console.log('模拟WebSocket连接已建立，只在用户执行操作时发送消息和通知');

        // 不再自动模拟随机消息
        // 通知将只在用户执行实际操作时发送
    }

    // 获取随机评论内容
    function getRandomComment() {
        const comments = [
            '这个任务需要尽快完成。',
            '我已经开始处理这个问题了。',
            '这个功能看起来不错！',
            '我们需要重新考虑这个设计。',
            '我在这部分代码中发现了一个bug。',
            '已经解决了前面提到的问题。',
            '这个实现方式很棒！',
            '我认为我们可以进一步优化这个部分。'
        ];
        return comments[Math.floor(Math.random() * comments.length)];
    }

    // 处理WebSocket消息
    function handleWebSocketMessage(message) {
        // 解析消息类型和数据
        const { type, data } = message;

        // 找到对应的处理函数并执行
        if (realtimeHandlers[type]) {
            realtimeHandlers[type](data);
        } else {
            console.warn(`未知的消息类型: ${type}`);
        }
    }

    // 处理WebSocket连接关闭
    function handleSocketClose() {
        updateConnectionStatus('offline');

        // 尝试重新连接
        handleReconnect();
    }

    // 处理WebSocket错误
    function handleSocketError(error) {
        console.error('WebSocket连接错误:', error);
        updateConnectionStatus('offline');

        // 尝试重新连接
        handleReconnect();
    }

    // 处理重新连接
    function handleReconnect() {
        if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            updateConnectionStatus('connecting');

            console.log(`尝试重新连接 (${reconnectAttempts}/${maxReconnectAttempts})...`);

            // 等待一段时间后尝试重新连接
            setTimeout(() => {
                initWebSocket();
            }, reconnectInterval);
        } else {
            console.error('达到最大重连次数，放弃重连。');
            updateConnectionStatus('offline');

            // 通知用户
            if (window.notificationSystem) {
                window.notificationSystem.addNotification(
                    'system',
                    '连接失败',
                    '无法连接到实时更新服务，请刷新页面重试。',
                    null
                );
            }
        }
    }

    // 更新连接状态UI
    function updateConnectionStatus(status) {
        // 移除所有状态类
        statusIndicator.classList.remove('online', 'offline', 'connecting');

        // 添加当前状态类
        statusIndicator.classList.add(status);

        // 更新文本
        const statusText = {
            online: '实时连接已建立',
            offline: '实时连接已断开',
            connecting: '正在连接...'
        };

        statusIndicator.innerHTML = `<i class="fas fa-circle"></i> ${statusText[status]}`;
    }

    // 获取当前用户ID（在实际应用中，这应该从用户会话中获取）
    function getCurrentUserId() {
        // 模拟用户ID
        return 'currentUser'; // 在真实应用中应该是用户的实际ID
    }

    // 处理任务创建
    function handleTaskCreated(task) {
        // 实际应用中，这里应该调用任务创建函数，更新任务列表UI
        console.log('收到新任务创建通知:', task);

        // 发送通知
        if (window.notificationSystem) {
            window.notificationSystem.addNotification(
                'task',
                '新任务已创建',
                `任务"${task.title}"已被创建。`,
                task.id
            );
        }

        // 这里可以添加代码来更新UI
    }

    // 处理任务更新
    function handleTaskUpdated(taskId, updateData) {
        // 实际应用中，这里应该更新任务数据，刷新UI
        console.log(`收到任务${taskId}更新通知:`, updateData);

        // 发送通知
        if (window.notificationSystem) {
            window.notificationSystem.addNotification(
                'task',
                '任务已更新',
                `任务#${taskId}已被更新。`,
                taskId
            );
        }

        // 这里可以添加代码来更新UI
    }

    // 处理进度更新
    function handleProgressUpdate(taskId, progress, userId) {
        // 实际应用中，这里应该更新任务进度，刷新UI
        console.log(`收到任务${taskId}进度更新:`, progress);

        // 查找任务元素并更新进度
        const progressElement = document.getElementById(`task-progress-${taskId}`);
        if (progressElement) {
            progressElement.textContent = `${progress}%`;
        }

        // 如果任务详情页面正在显示，更新进度条
        const progressBarFill = document.getElementById('progress-bar-fill');
        if (progressBarFill && document.getElementById('task-details-modal').style.display !== 'none') {
            progressBarFill.style.width = `${progress}%`;
        }

        // 发送通知
        if (window.notificationSystem) {
            window.notificationSystem.addNotification(
                'task',
                '任务进度已更新',
                `任务#${taskId}的进度已更新为${progress}%。`,
                taskId
            );
        }
    }

    // 处理新评论
    function handleNewComment(taskId, comment, userId) {
        // 实际应用中，这里应该将评论添加到任务的评论列表，刷新UI
        console.log(`收到任务${taskId}新评论:`, comment);

        // 如果任务详情页面正在显示，且评论列表存在，添加评论
        const commentsList = document.getElementById('comments-list');
        if (commentsList && document.getElementById('task-details-modal').style.display !== 'none') {
            const li = document.createElement('li');
            li.textContent = comment;
            commentsList.appendChild(li);
        }

        // 更新任务列表中的评论计数
        const commentsElement = document.getElementById(`task-comments-${taskId}`);
        if (commentsElement) {
            // 获取当前评论数（假设格式为 "X 条"）
            const currentCountStr = commentsElement.textContent;
            const currentCount = parseInt(currentCountStr, 10) || 0;
            commentsElement.textContent = `${currentCount + 1} 条`;
        }

        // 发送通知
        if (window.notificationSystem) {
            window.notificationSystem.addNotification(
                'comment',
                '新评论',
                `任务#${taskId}收到了新评论。`,
                taskId
            );
        }
    }

    // 处理分支创建
    function handleBranchCreated(taskId, branch, userId) {
        // 实际应用中，这里应该将分支添加到任务的分支列表，刷新UI
        console.log(`收到任务${taskId}新分支:`, branch);

        // 如果任务详情页面正在显示，且分支列表存在，添加分支
        const branchList = document.getElementById('branch-list');
        if (branchList && document.getElementById('task-details-modal').style.display !== 'none') {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${branch.name}</strong>: ${branch.content}`;
            branchList.appendChild(li);
        }

        // 更新任务列表中的分支计数
        const branchesElement = document.getElementById(`task-branches-${taskId}`);
        if (branchesElement) {
            // 获取当前分支数（假设格式为 "X 个"）
            const currentCountStr = branchesElement.textContent;
            const currentCount = parseInt(currentCountStr, 10) || 0;
            branchesElement.textContent = `${currentCount + 1} 个`;
        }

        // 发送通知
        if (window.notificationSystem) {
            window.notificationSystem.addNotification(
                'task',
                '新分支已创建',
                `任务#${taskId}创建了新分支"${branch.name}"。`,
                taskId
            );
        }
    }

    // 处理合并请求
    function handleMergeRequest(taskId, mergeRequest, userId) {
        // 实际应用中，这里应该将合并请求添加到任务的合并请求列表，刷新UI
        console.log(`收到任务${taskId}合并请求:`, mergeRequest);

        // 如果任务详情页面正在显示，且合并请求列表存在，添加合并请求
        const mergeRequestsList = document.getElementById('merge-requests-list');
        if (mergeRequestsList && document.getElementById('task-details-modal').style.display !== 'none') {
            const li = document.createElement('li');
            li.textContent = `源分支: ${mergeRequest.source}, 目标分支: ${mergeRequest.target}`;
            mergeRequestsList.appendChild(li);
        }

        // 发送通知
        if (window.notificationSystem) {
            window.notificationSystem.addNotification(
                'merge',
                '新合并请求',
                `任务#${taskId}创建了新的合并请求：从"${mergeRequest.source}"到"${mergeRequest.target}"。`,
                taskId
            );
        }
    }

    // 处理任务删除
    function handleTaskDeleted(taskId) {
        // 实际应用中，这里应该从任务列表中移除任务，刷新UI
        console.log(`收到任务${taskId}删除通知`);

        // 从UI中移除任务元素
        const taskElement = document.getElementById(`task-${taskId}`);
        if (taskElement) {
            taskElement.remove();
        }

        // 发送通知
        if (window.notificationSystem) {
            window.notificationSystem.addNotification(
                'task',
                '任务已删除',
                `任务#${taskId}已被删除。`,
                null
            );
        }
    }

    // 发送通知
    function sendNotification(action, taskId, payload, userId) {
        if (!window.notificationSystem) return;

        // 根据操作类型生成不同的通知
        let notificationType, title, message;

        switch (action) {
            case 'create':
                notificationType = 'task';
                title = '新任务已创建';
                message = `任务"${payload.title}"已被创建。`;
                break;
            case 'update':
                notificationType = 'task';
                title = '任务已更新';
                message = `任务#${taskId}已被更新。`;
                break;
            case 'progress':
                notificationType = 'task';
                title = '任务进度已更新';
                message = `任务#${taskId}的进度已更新为${payload.progress}%。`;
                break;
            case 'comment':
                notificationType = 'comment';
                title = '新评论';
                message = `任务#${taskId}收到了新评论。`;
                break;
            case 'branch':
                notificationType = 'task';
                title = '新分支已创建';
                message = `任务#${taskId}创建了新分支"${payload.branch.name}"。`;
                break;
            case 'mergeRequest':
                notificationType = 'merge';
                title = '新合并请求';
                message = `任务#${taskId}创建了新的合并请求。`;
                break;
            case 'delete':
                notificationType = 'task';
                title = '任务已删除';
                message = `任务#${taskId}已被删除。`;
                break;
            default:
                return; // 不处理未知操作类型
        }

        // 发送通知
        window.notificationSystem.addNotification(notificationType, title, message, action === 'delete' ? null : taskId);
    }

    // 显示系统消息
    function showSystemMessage(message, type) {
        if (!window.notificationSystem) return;

        window.notificationSystem.addNotification(
            'system',
            type === 'error' ? '系统错误' : '系统消息',
            message,
            null
        );
    }

    // 更新在线用户UI
    function updateOnlineUsersUI() {
        // 这个函数应该更新显示在线用户的UI部分
        // 在当前应用中可能没有这样的UI元素，所以只是记录日志
        console.log('在线用户更新:', realtimeData.activeUsers);
    }

    // 连接到WebSocket服务器
    initWebSocket();

    // 公开API
    window.realtimeSystem = {
        getStatus: function () {
            return statusIndicator.classList.contains('online') ? 'online' :
                statusIndicator.classList.contains('connecting') ? 'connecting' : 'offline';
        },
        reconnect: function () {
            reconnectAttempts = 0;
            initWebSocket();
        },
        // 模拟发送消息的函数（在实际应用中，这里应该是真正的发送逻辑）
        sendMessage: function (type, data) {
            console.log('发送消息:', { type, data });
            // 在真实环境中，这里应该通过WebSocket发送消息
            return true;
        },
        // 测试用：模拟接收不同类型的消息
        simulateMessage: function (type, data) {
            handleWebSocketMessage({ type, data });
        }
    };
}); 