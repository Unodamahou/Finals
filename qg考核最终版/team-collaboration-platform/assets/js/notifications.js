/**
 * 通知系统 - 处理通知的显示、管理和交互
 */

document.addEventListener('DOMContentLoaded', () => {
    const notificationContainer = document.getElementById('notification-container');
    const notificationBadge = document.getElementById('notification-badge');
    const notificationList = document.getElementById('notification-list');
    const notificationToggle = document.getElementById('notification-toggle');

    // 从API获取通知
    const API_BASE_URL = 'http://localhost:3001/api';
    let unreadCount = 0;
    let notifications = [];

    // 本地存储键
    const NOTIFICATIONS_STORAGE_KEY = 'team_collaboration_notifications';

    // 模拟API标志 - 当API不可用时切换为true
    let useLocalStorage = false;

    // 加载通知
    const loadNotifications = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.warn('用户未登录，无法加载通知');
                return;
            }

            // 尝试从API获取通知
            try {
                const response = await fetch(`${API_BASE_URL}/notifications`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('获取通知失败');
                }

                const data = await response.json();
                notifications = data;
                useLocalStorage = false;
                console.log('从API加载通知成功');
            } catch (error) {
                // API调用失败，切换到本地存储模式
                useLocalStorage = true;
                console.warn('API不可用，使用本地存储模式:', error);

                // 从本地存储加载通知
                const storedNotifications = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
                if (storedNotifications) {
                    notifications = JSON.parse(storedNotifications);
                }
            }

            // 计算未读通知
            unreadCount = notifications.filter(n => !n.read).length;

            // 更新通知徽章
            updateNotificationBadge();

            // 渲染通知列表
            renderNotifications();
        } catch (error) {
            console.error('加载通知错误:', error);
        }
    };

    // 添加新通知
    const addNotification = async (type, title, message, taskId = null) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.warn('用户未登录，无法添加通知');
                return;
            }

            // 创建新通知对象
            const newNotification = {
                id: Date.now(),
                type,
                title,
                message,
                task_id: taskId,
                read: false,
                created_at: new Date().toISOString()
            };

            if (!useLocalStorage) {
                // 尝试使用API
                try {
                    const response = await fetch(`${API_BASE_URL}/notifications`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            type,
                            title,
                            message,
                            task_id: taskId
                        })
                    });

                    if (!response.ok) {
                        throw new Error('添加通知失败');
                    }

                    const data = await response.json();

                    // 使用API返回的通知对象
                    notifications.unshift(data);
                    console.log('通过API添加通知成功');
                } catch (error) {
                    // API失败，切换到本地存储模式
                    useLocalStorage = true;
                    console.warn('API不可用，切换至本地存储模式:', error);

                    // 添加到本地通知
                    notifications.unshift(newNotification);

                    // 保存到本地存储
                    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
                }
            } else {
                // 使用本地存储模式
                notifications.unshift(newNotification);
                localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
            }

            // 更新未读计数
            unreadCount++;

            // 更新UI
            updateNotificationBadge();
            renderNotifications();

            // 显示新通知提示
            showNotificationToast(type, title, message);
        } catch (error) {
            console.error('添加通知错误:', error);

            // 出错时也确保通知被添加
            const newNotification = {
                id: Date.now(),
                type,
                title,
                message,
                task_id: taskId,
                read: false,
                created_at: new Date().toISOString()
            };

            notifications.unshift(newNotification);

            // 如果使用本地存储，保存
            if (useLocalStorage) {
                localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
            }

            unreadCount++;

            // 更新UI
            updateNotificationBadge();
            renderNotifications();

            // 显示新通知提示
            showNotificationToast(type, title, message);
        }
    };

    // 标记通知为已读
    const markNotificationAsRead = async (notificationId) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.warn('用户未登录，无法标记通知');
                return;
            }

            if (!useLocalStorage) {
                // 尝试使用API
                try {
                    const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (!response.ok) {
                        throw new Error('标记通知失败');
                    }

                    console.log('通过API标记通知成功');
                } catch (error) {
                    // API失败，切换到本地存储模式
                    useLocalStorage = true;
                    console.warn('API不可用，切换至本地存储模式:', error);
                }
            }

            // 更新本地通知状态
            const notification = notifications.find(n => n.id === notificationId);
            if (notification && !notification.read) {
                notification.read = true;
                unreadCount = Math.max(0, unreadCount - 1);

                // 如果使用本地存储，保存更改
                if (useLocalStorage) {
                    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
                }

                // 更新UI
                updateNotificationBadge();
                renderNotifications();
            }
        } catch (error) {
            console.error('标记通知错误:', error);

            // 即使API失败，也更新本地通知状态
            const notification = notifications.find(n => n.id === notificationId);
            if (notification && !notification.read) {
                notification.read = true;
                unreadCount = Math.max(0, unreadCount - 1);

                // 如果使用本地存储，保存更改
                if (useLocalStorage) {
                    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
                }

                // 更新UI
                updateNotificationBadge();
                renderNotifications();
            }
        }
    };

    // 标记所有通知为已读
    const markAllNotificationsAsRead = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.warn('用户未登录，无法标记所有通知');
                return;
            }

            if (!useLocalStorage) {
                // 尝试使用API
                try {
                    const response = await fetch(`${API_BASE_URL}/notifications/read-all`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (!response.ok) {
                        throw new Error('标记所有通知失败');
                    }

                    console.log('通过API标记所有通知成功');
                } catch (error) {
                    // API失败，切换到本地存储模式
                    useLocalStorage = true;
                    console.warn('API不可用，切换至本地存储模式:', error);
                }
            }

            // 更新本地通知状态
            notifications.forEach(n => {
                if (!n.read) {
                    n.read = true;
                }
            });

            unreadCount = 0;

            // 如果使用本地存储，保存更改
            if (useLocalStorage) {
                localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
            }

            // 更新UI
            updateNotificationBadge();
            renderNotifications();
        } catch (error) {
            console.error('标记所有通知错误:', error);

            // 即使API失败，也更新本地通知状态
            notifications.forEach(n => {
                if (!n.read) {
                    n.read = true;
                }
            });

            unreadCount = 0;

            // 如果使用本地存储，保存更改
            if (useLocalStorage) {
                localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
            }

            // 更新UI
            updateNotificationBadge();
            renderNotifications();
        }
    };

    // 更新通知徽章
    const updateNotificationBadge = () => {
        if (!notificationBadge) return;

        if (unreadCount > 0) {
            notificationBadge.textContent = unreadCount;
            notificationBadge.style.display = 'flex';
        } else {
            notificationBadge.style.display = 'none';
        }
    };

    // 渲染通知列表
    const renderNotifications = () => {
        if (!notificationList) return;

        // 清空列表
        notificationList.innerHTML = '';

        if (notifications.length === 0) {
            const emptyItem = document.createElement('li');
            emptyItem.className = 'empty-notification';
            emptyItem.textContent = '暂无通知';
            notificationList.appendChild(emptyItem);
            return;
        }

        // 添加"全部标记为已读"按钮
        if (unreadCount > 0) {
            const markAllReadItem = document.createElement('li');
            markAllReadItem.className = 'mark-all-read';
            markAllReadItem.textContent = '全部标记为已读';
            markAllReadItem.addEventListener('click', markAllNotificationsAsRead);
            notificationList.appendChild(markAllReadItem);
        }

        // 渲染通知
        notifications.forEach(notification => {
            const item = document.createElement('li');
            item.className = `notification-item ${notification.read ? 'read' : 'unread'}`;

            // 根据类型设置图标
            let icon = '';
            switch (notification.type) {
                case 'task':
                    icon = '<i class="fas fa-tasks"></i>';
                    break;
                case 'comment':
                    icon = '<i class="fas fa-comment"></i>';
                    break;
                case 'system':
                    icon = '<i class="fas fa-cog"></i>';
                    break;
                case 'merge':
                    icon = '<i class="fas fa-code-branch"></i>';
                    break;
                default:
                    icon = '<i class="fas fa-bell"></i>';
            }

            // 格式化时间
            const dateObj = new Date(notification.created_at);
            const formattedDate = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getDate().toString().padStart(2, '0')} ${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;

            item.innerHTML = `
                <div class="notification-icon">${icon}</div>
                <div class="notification-content">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-message">${notification.message}</div>
                    <div class="notification-time">${formattedDate}</div>
                </div>
                ${!notification.read ? '<div class="notification-mark-read"><i class="fas fa-check"></i></div>' : ''}
            `;

            // 添加点击事件处理
            if (!notification.read) {
                const markReadBtn = item.querySelector('.notification-mark-read');
                if (markReadBtn) {
                    markReadBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        markNotificationAsRead(notification.id);
                    });
                }
            }

            // 如果有关联任务，点击跳转到任务详情
            if (notification.task_id) {
                item.addEventListener('click', () => {
                    // 标记为已读
                    if (!notification.read) {
                        markNotificationAsRead(notification.id);
                    }

                    // 打开任务详情
                    if (window.taskManager) {
                        const task = window.taskManager.getTasks().find(t => t.id === notification.task_id);
                        if (task) {
                            // 调用任务详情打开函数
                            const openTaskDetails = window.taskManager.openTaskDetails || window.openTaskDetails;
                            if (typeof openTaskDetails === 'function') {
                                openTaskDetails(notification.task_id);
                            }
                        }
                    }
                });
            }

            notificationList.appendChild(item);
        });
    };

    // 显示新通知提示
    const showNotificationToast = (type, title, message) => {
        // 如果浏览器支持通知API并且已授权
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: message,
                icon: '/assets/images/logo.png'
            });
        }

        // 创建页面内通知提示
        if (notificationContainer) {
            const toast = document.createElement('div');
            toast.className = `notification-toast ${type}`;

            // 根据类型设置图标
            let icon = '';
            switch (type) {
                case 'task':
                    icon = '<i class="fas fa-tasks"></i>';
                    break;
                case 'comment':
                    icon = '<i class="fas fa-comment"></i>';
                    break;
                case 'system':
                    icon = '<i class="fas fa-cog"></i>';
                    break;
                case 'merge':
                    icon = '<i class="fas fa-code-branch"></i>';
                    break;
                default:
                    icon = '<i class="fas fa-bell"></i>';
            }

            toast.innerHTML = `
                <div class="notification-toast-icon">${icon}</div>
                <div class="notification-toast-content">
                    <div class="notification-toast-title">${title}</div>
                    <div class="notification-toast-message">${message}</div>
                </div>
                <div class="notification-toast-close"><i class="fas fa-times"></i></div>
            `;

            // 添加关闭按钮事件
            const closeBtn = toast.querySelector('.notification-toast-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    toast.classList.add('hide');
                    setTimeout(() => {
                        toast.remove();
                    }, 300);
                });
            }

            // 添加到容器
            notificationContainer.appendChild(toast);

            // 自动消失
            setTimeout(() => {
                toast.classList.add('hide');
                setTimeout(() => {
                    toast.remove();
                }, 300);
            }, 5000);
        }
    };

    // 切换通知面板显示
    if (notificationToggle) {
        notificationToggle.addEventListener('click', () => {
            const notificationPanel = document.getElementById('notification-panel');
            if (notificationPanel) {
                const isOpen = notificationPanel.classList.toggle('open');

                // 打开通知面板时，加载最新通知
                if (isOpen) {
                    loadNotifications();
                }
            }
        });
    }

    // 初始化时请求通知权限
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }

    // 创建一些示例通知（仅在第一次加载时）
    const initializeNotifications = () => {
        if (!localStorage.getItem(NOTIFICATIONS_STORAGE_KEY)) {
            const exampleNotifications = [
                {
                    id: Date.now() - 100000,
                    type: 'system',
                    title: '欢迎使用团队协作平台',
                    message: '感谢您使用我们的平台，您可以在这里管理团队、任务和通知。',
                    task_id: null,
                    read: false,
                    created_at: new Date().toISOString()
                },
                {
                    id: Date.now() - 200000,
                    type: 'task',
                    title: '示例任务通知',
                    message: '这是一个任务通知示例。实际使用时，您会收到关于任务的各种通知。',
                    task_id: null,
                    read: false,
                    created_at: new Date(Date.now() - 3600000).toISOString()
                }
            ];

            localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(exampleNotifications));
        }
    };

    // 初始化示例通知
    initializeNotifications();

    // 初始加载通知
    loadNotifications();

    // 定期更新通知（每分钟）
    setInterval(loadNotifications, 60000);

    // 暴露通知系统API
    window.notificationSystem = {
        addNotification,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        getNotifications: () => notifications,
        getUnreadCount: () => unreadCount,
        loadNotifications
    };

    // 如果系统初始化完成，添加一个启动通知
    setTimeout(() => {
        addNotification(
            'system',
            '系统已准备就绪',
            '通知系统已启动，您将在这里收到所有重要更新。'
        );
    }, 2000);
});