document.addEventListener('DOMContentLoaded', () => {
    const groupManagementLink = document.getElementById('group-management');
    const taskManagementLink = document.getElementById('task-management');
    const defaultContent = document.getElementById('default-content');
    const groupManagementContent = document.getElementById('group-management-content');
    const taskManagementContent = document.getElementById('task-management-content');

    // 获取 DOM 元素
    const openAddMemberForm = document.getElementById('open-add-member-form');
    const closeAddMemberForm = document.getElementById('close-add-member-form');
    const addMemberForm = document.getElementById('add-member-form');
    const memberForm = document.getElementById('member-form');
    const memberList = document.getElementById('member-list');

    const openCreateGroupForm = document.getElementById('open-create-group-form');
    const closeGroupForm = document.getElementById('close-group-form');
    const createGroupForm = document.getElementById('create-group-form');
    const groupForm = document.getElementById('group-form');
    const groupList = document.getElementById('group-list');
    const groupMembersSelect = document.getElementById('group-members');
    const groupLeaderSelect = document.getElementById('group-leader');

    const openCreateTaskFormBtn = document.getElementById('open-create-task-form');
    const closeTaskFormBtn = document.getElementById('close-task-form');
    const taskForm = document.getElementById('create-task-form');
    const taskFormElement = document.getElementById('task-form');
    const taskDependenciesSelect = document.getElementById('task-dependencies');

    const taskList = document.getElementById('task-list');
    const taskDetailsModal = document.getElementById('task-details-modal');
    const taskDetailsTitle = document.getElementById('task-details-title');
    const taskDetailsDescription = document.getElementById('task-details-description');
    const branchList = document.getElementById('branch-list');
    const progressBarFill = document.getElementById('progress-bar-fill');
    const commentsList = document.getElementById('comments-list');
    const taskHistoryList = document.getElementById('task-history-list');
    const newCommentInput = document.getElementById('new-comment');
    const addCommentBtn = document.getElementById('add-comment-btn');
    const closeTaskDetailsBtn = document.getElementById('close-task-details');
    const newBranchNameInput = document.getElementById('new-branch-name');
    const newBranchContentInput = document.getElementById('new-branch-content');
    const addBranchBtn = document.getElementById('add-branch-btn');
    const progressPercentageInput = document.getElementById('progress-percentage');
    const updateProgressBtn = document.getElementById('update-progress-btn');
    const rollbackTaskBtn = document.getElementById('rollback-task-btn');
    const mergeRequestsList = document.getElementById('merge-requests-list');
    const mergeSourceBranchInput = document.getElementById('merge-source-branch');
    const mergeTargetBranchInput = document.getElementById('merge-target-branch');
    const submitMergeRequestBtn = document.getElementById('submit-merge-request-btn');
    const conflictSection = document.getElementById('conflict-section');
    const conflictList = document.getElementById('conflict-list');
    const taskGroupSelect = document.getElementById('task-group');

    // 任务依赖管理元素
    const prerequisiteTasksList = document.getElementById('prerequisite-tasks-list');
    const dependentTasksList = document.getElementById('dependent-tasks-list');
    const addDependencySelect = document.getElementById('add-dependency');
    const removeDependencySelect = document.getElementById('remove-dependency');
    const addDependencyBtn = document.getElementById('add-dependency-btn');
    const removeDependencyBtn = document.getElementById('remove-dependency-btn');
    const completeTaskBtn = document.getElementById('complete-task-btn');
    const reopenTaskBtn = document.getElementById('reopen-task-btn');
    const taskCompletionStatus = document.getElementById('task-completion-status');

    // 检查必要元素是否存在
    if (!taskDetailsModal || !closeTaskDetailsBtn) {
        console.error('任务详情模态框或关闭按钮未找到！');
    }

    // 定义全局数组
    const members = []; // 存储成员数据
    const groups = []; // 存储小组数据
    const tasks = []; // 存储任务数据
    let currentTaskId = null; // 当前打开的任务ID

    // 基础API URL
    const API_BASE_URL = 'http://localhost:3001/api';
    const WS_URL = 'ws://localhost:3002';

    // 从数据库加载所有成员
    const loadMembers = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/members`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('获取成员数据失败');
            }

            const data = await response.json();
            console.log('成员数据加载成功:', data);

            // 清空当前成员列表
            members.length = 0;

            // 更新成员数组
            data.forEach(member => {
                members.push(member);

                // 创建并添加成员展示元素
                if (memberList) {
                    const memberItem = document.createElement('div');
                    memberItem.className = 'member-item';
                    memberItem.innerHTML = `
                        <p>姓名: ${member.name}</p>
                        <p>性别: ${member.gender}</p>
                        <p>年龄: ${member.age}</p>
                    `;
                    memberList.appendChild(memberItem);
                }

                // 更新小组成员选择框
                updateGroupMembers(member);
            });
        } catch (error) {
            console.error('加载成员错误:', error);
        }
    };

    // 打开和关闭表单的通用函数
    const toggleForm = (form, isOpen) => {
        if (!form) return;
        form.style.display = isOpen ? 'flex' : 'none';
    };

    // 打开和关闭添加成员表单
    if (openAddMemberForm) {
        openAddMemberForm.addEventListener('click', () => toggleForm(addMemberForm, true));
    }
    if (closeAddMemberForm) {
        closeAddMemberForm.addEventListener('click', () => toggleForm(addMemberForm, false));
    }

    // 打开和关闭创建小组表单
    if (openCreateGroupForm) {
        openCreateGroupForm.addEventListener('click', () => toggleForm(createGroupForm, true));
    }
    if (closeGroupForm) {
        closeGroupForm.addEventListener('click', () => toggleForm(createGroupForm, false));
    }

    // 打开创建任务表单
    if (openCreateTaskFormBtn) {
        openCreateTaskFormBtn.addEventListener('click', () => {
            // 更新依赖任务下拉选项
            updateTaskDependenciesOptions();
            toggleForm(taskForm, true);
        });
    }

    // 关闭创建任务表单
    if (closeTaskFormBtn) {
        closeTaskFormBtn.addEventListener('click', () => {
            toggleForm(taskForm, false);
        });
    }

    // 关闭任务详情模态框
    if (closeTaskDetailsBtn) {
        closeTaskDetailsBtn.addEventListener('click', () => {
            toggleForm(taskDetailsModal, false);
            currentTaskId = null;
        });
    }

    // 更新任务依赖选择框选项
    const updateTaskDependenciesOptions = () => {
        if (!taskDependenciesSelect) return;

        // 清空当前选项（保留第一个默认选项）
        while (taskDependenciesSelect.options.length > 1) {
            taskDependenciesSelect.remove(1);
        }

        // 添加现有任务
        tasks.forEach(task => {
            const option = document.createElement('option');
            option.value = task.id;
            option.textContent = task.title;
            taskDependenciesSelect.appendChild(option);
        });
    };

    // 更新任务依赖下拉列表（用于添加/删除）
    const updateDependencySelects = (taskId) => {
        if (!addDependencySelect || !removeDependencySelect) return;

        const currentTask = tasks.find(t => t.id === taskId);
        if (!currentTask) return;

        // 更新添加依赖下拉列表
        addDependencySelect.innerHTML = '<option value="">选择要添加的依赖任务</option>';

        // 更新移除依赖下拉列表
        removeDependencySelect.innerHTML = '<option value="">选择要移除的依赖任务</option>';

        tasks.forEach(task => {
            // 不包括自己和已经是依赖项的任务
            if (task.id !== taskId && !currentTask.prerequisites.includes(task.id)) {
                const option = document.createElement('option');
                option.value = task.id;
                option.textContent = task.title;
                addDependencySelect.appendChild(option);
            }

            // 只包括当前任务的依赖项
            if (currentTask.prerequisites.includes(task.id)) {
                const option = document.createElement('option');
                option.value = task.id;
                option.textContent = task.title;
                removeDependencySelect.appendChild(option);
            }
        });
    };

    // 渲染任务依赖列表
    const renderDependencyLists = (taskId) => {
        if (!prerequisiteTasksList || !dependentTasksList) return;

        const currentTask = tasks.find(t => t.id === taskId);
        if (!currentTask) return;

        // 清空列表
        prerequisiteTasksList.innerHTML = '';
        dependentTasksList.innerHTML = '';

        // 检查是否有前置依赖
        if (currentTask.prerequisites.length === 0) {
            prerequisiteTasksList.innerHTML = '<li class="empty-list-message">无前置依赖任务</li>';
        } else {
            currentTask.prerequisites.forEach(preId => {
                const prerequisiteTask = tasks.find(t => t.id === preId);
                if (prerequisiteTask) {
                    const isCompleted = prerequisiteTask.isCompleted;
                    const listItem = document.createElement('li');
                    listItem.className = isCompleted ? 'completed' : '';
                    listItem.innerHTML = `
                        <span>${prerequisiteTask.title}</span>
                        <span class="task-status">
                            ${isCompleted ?
                            '<i class="fas fa-check-circle" style="color: #2ecc71;"></i> 已完成' :
                            '<i class="fas fa-clock" style="color: #f39c12;"></i> 未完成'
                        }
                        </span>
                    `;
                    prerequisiteTasksList.appendChild(listItem);
                }
            });
        }

        // 寻找所有依赖于当前任务的任务
        const dependentTasks = tasks.filter(t => t.prerequisites.includes(taskId));

        // 检查是否有后置任务
        if (dependentTasks.length === 0) {
            dependentTasksList.innerHTML = '<li class="empty-list-message">无后置依赖任务</li>';
        } else {
            dependentTasks.forEach(task => {
                const listItem = document.createElement('li');
                listItem.className = 'dependent-task';
                listItem.innerHTML = `
                    <span>${task.title}</span>
                    <span class="task-status">
                        ${task.isCompleted ?
                        '<i class="fas fa-check-circle" style="color: #2ecc71;"></i> 已完成' :
                        '<i class="fas fa-clock" style="color: #f39c12;"></i> 待处理'
                    }
                    </span>
                `;
                dependentTasksList.appendChild(listItem);
            });
        }
    };

    // 更新任务状态（检查前置依赖是否全部完成）
    const updateTaskStatus = (taskId) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        // 如果任务已经完成，不需要更新状态
        if (task.isCompleted) return;

        // 检查所有前置依赖是否已完成
        const allPrerequisitesCompleted = task.prerequisites.every(preId => {
            const prerequisiteTask = tasks.find(t => t.id === preId);
            return prerequisiteTask && prerequisiteTask.isCompleted;
        });

        // 更新任务状态
        task.isBlocked = !allPrerequisitesCompleted;

        // 更新UI
        updateTaskDisplay(taskId);
    };

    // 任务完成时通知后续任务的负责人
    const notifyDependentTasks = (taskId) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        // 查找所有依赖于当前任务的任务
        const dependentTasks = tasks.filter(t => t.prerequisites.includes(taskId));

        dependentTasks.forEach(dependentTask => {
            // 检查依赖任务的所有前置依赖是否都已完成
            const allPrerequisitesCompleted = dependentTask.prerequisites.every(preId => {
                const prerequisiteTask = tasks.find(t => t.id === preId);
                return prerequisiteTask && prerequisiteTask.isCompleted;
            });

            // 如果所有前置依赖都已完成，则通知后续任务的负责人
            if (allPrerequisitesCompleted) {
                // 更新依赖任务的状态
                dependentTask.isBlocked = false;

                // 实时更新
                if (window.realtimeSystem) {
                    window.realtimeSystem.sendMessage('taskUpdate', {
                        taskId: dependentTask.id,
                        action: 'unblock',
                        payload: { unblockingTaskId: taskId },
                        userId: 'currentUser'
                    });
                }

                // 发送通知
                if (window.notificationSystem) {
                    window.notificationSystem.addNotification(
                        'task',
                        '任务可以开始',
                        `任务"${dependentTask.title}"的所有前置依赖已完成，可以开始工作了。`,
                        dependentTask.id
                    );
                }

                // 更新UI
                updateTaskDisplay(dependentTask.id);
            }
        });
    };

    // 从数据库加载所有任务
    const loadTasks = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/tasks`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('获取任务数据失败');
            }

            const data = await response.json();
            console.log('任务数据加载成功:', data);

            // 清空当前任务列表和UI
            tasks.length = 0;
            if (taskList) {
                taskList.innerHTML = '';
            }

            // 加载每个任务
            for (const taskData of data) {
                // 获取任务依赖关系
                const dependenciesResponse = await fetch(`${API_BASE_URL}/tasks/${taskData.id}/dependencies`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                const dependenciesData = await dependenciesResponse.json();
                const prerequisites = dependenciesData.prerequisites || [];

                // 使用从API获取的数据创建任务（但不发送到服务器）
                createTaskFromData(
                    taskData.title,
                    taskData.description,
                    taskData.group_id,
                    prerequisites,
                    taskData.id,
                    taskData.progress,
                    taskData.completed === 1
                );
            }

            // 更新任务依赖选择框
            updateTaskDependenciesOptions();
        } catch (error) {
            console.error('加载任务错误:', error);
        }
    };

    // 创建任务方法 (从API数据创建本地任务对象)
    const createTaskFromData = (title, description, groupId = null, prerequisites = [], taskId = null, progress = 0, isCompleted = false) => {
        const task = {
            id: taskId,
            title,
            description,
            groupId,
            prerequisites: prerequisites, // 前置依赖任务ID数组
            branches: [],
            progressPercentage: progress,
            comments: [],
            history: [],
            mergeRequests: [],
            conflicts: [],
            isCompleted: isCompleted,  // 任务完成状态
            isBlocked: false,    // 是否被依赖任务阻塞
            completedAt: null    // 完成时间
        };

        // 检查前置依赖是否都已完成
        if (prerequisites.length > 0) {
            const hasIncompletePrerequisites = prerequisites.some(preId => {
                const prerequisiteTask = tasks.find(t => t.id === preId);
                return prerequisiteTask && !prerequisiteTask.isCompleted;
            });

            // 如果有未完成的前置任务，则阻塞当前任务
            task.isBlocked = hasIncompletePrerequisites;
        }

        // 添加创建记录到历史
        const currentDate = new Date();
        task.history.push({
            time: currentDate.toLocaleString(),
            action: '加载任务',
            description: '从服务器加载任务数据',
            previousState: null
        });

        tasks.push(task);

        // 查找关联的小组
        let groupName = '未分配';
        if (groupId) {
            const group = groups.find(g => g.id === parseInt(groupId));
            if (group) {
                groupName = group.name;
            }
        }

        // 动态生成任务展示框
        const taskItem = document.createElement('div');
        taskItem.className = 'task-item';
        taskItem.id = `task-${task.id}`;

        // 添加依赖指示器
        let statusHtml = '';
        if (task.isCompleted) {
            statusHtml = `<div class="task-status"><span class="status-dot completed"></span>已完成</div>`;
        } else if (task.isBlocked) {
            statusHtml = `<div class="task-status"><span class="status-dot blocked"></span>等待依赖</div>`;
        } else {
            statusHtml = `<div class="task-status"><span class="status-dot ready"></span>可以开始</div>`;
        }

        // 添加依赖指示器
        let dependencyHtml = '';
        if (prerequisites.length > 0) {
            dependencyHtml = `<span class="dependency-indicator">依赖: <span class="count">${prerequisites.length}</span></span>`;
        }

        taskItem.innerHTML = `
            <h3>${title} ${dependencyHtml}</h3>
            <p>${description}</p>
            <div class="task-info">
                <p><strong>小组:</strong> ${groupName}</p>
                <p><strong>进度:</strong> <span id="task-progress-${task.id}">${progress}%</span></p>
                <p><strong>评论:</strong> <span id="task-comments-${task.id}">0 条</span></p>
                <p><strong>分支:</strong> <span id="task-branches-${task.id}">0 个</span></p>
                ${statusHtml}
            </div>
            <button class="view-task-details-btn btn" data-task-id="${task.id}">查看详情</button>
        `;
        if (taskList) {
            taskList.appendChild(taskItem);

            // 绑定查看详情按钮
            const detailsBtn = taskItem.querySelector('.view-task-details-btn');
            if (detailsBtn) {
                detailsBtn.addEventListener('click', () => openTaskDetails(task.id));
            }
        }

        return task;
    };

    // 创建任务
    const createTask = async (title, description, groupId = null, prerequisites = []) => {
        try {
            // 发送任务创建请求到API
            const response = await fetch(`${API_BASE_URL}/tasks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    title,
                    description,
                    group_id: groupId,
                    progress: 0,
                    prerequisites: prerequisites
                })
            });

            if (!response.ok) {
                throw new Error('创建任务失败');
            }

            const taskData = await response.json();
            console.log('任务创建成功:', taskData);

            // 使用返回的数据创建本地任务
            const task = createTaskFromData(
                title,
                description,
                groupId,
                prerequisites,
                taskData.id,
                0,
                false
            );

            // 发送实时更新通知
            if (window.realtimeSystem) {
                window.realtimeSystem.sendMessage('taskUpdate', {
                    taskId: task.id,
                    action: 'create',
                    payload: {
                        title,
                        description,
                        groupId,
                        prerequisites: prerequisites
                    },
                    userId: 'currentUser' // 假设当前用户ID
                });
            }

            // 添加系统通知
            if (window.notificationSystem) {
                window.notificationSystem.addNotification(
                    'task',
                    '任务创建成功',
                    `任务"${title}"已成功创建。`,
                    task.id
                );
            }

            return task;
        } catch (error) {
            console.error('创建任务错误:', error);
            alert('创建任务失败: ' + error.message);
            return null;
        }
    };

    // 提交任务表单
    if (taskFormElement) {
        taskFormElement.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('task-title').value;
            const description = document.getElementById('task-description').value;
            const groupId = taskGroupSelect ? taskGroupSelect.value : null;

            // 获取依赖任务
            const selectedDependencies = Array.from(taskDependenciesSelect?.selectedOptions || [])
                .map(option => parseInt(option.value))
                .filter(id => !isNaN(id));

            if (title && description) {
                // 创建任务并发送到服务器
                const task = await createTask(title, description, groupId, selectedDependencies);

                if (task) {
                    toggleForm(taskForm, false);
                    taskFormElement.reset();
                }
            } else {
                alert('请填写所有必填字段！');
            }
        });
    }

    // 更新小组成员选择框
    const updateGroupMembers = (member) => {
        if (!groupMembersSelect || !groupLeaderSelect) return;

        const option = document.createElement('option');
        option.value = member.id;
        option.textContent = member.name;
        groupMembersSelect.appendChild(option);

        const leaderOption = document.createElement('option');
        leaderOption.value = member.id;
        option.dataset.memberId = member.id;
        leaderOption.textContent = member.name;
        groupLeaderSelect.appendChild(leaderOption);
    };

    // 更新任务小组选择框
    const updateTaskGroups = (group) => {
        if (!taskGroupSelect) return;

        const option = document.createElement('option');
        option.value = group.id;
        option.textContent = group.name;
        taskGroupSelect.appendChild(option);
    };

    // 添加成员功能
    if (memberForm) {
        memberForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const memberName = document.getElementById('member-name').value.trim();
            const memberGender = document.getElementById('member-gender').value;
            const memberAge = parseInt(document.getElementById('member-age').value, 10);

            if (!memberName || !memberGender || isNaN(memberAge) || memberAge <= 0) {
                alert('请填写所有字段，年龄必须是正整数！');
                return;
            }

            try {
                // 发送数据到后端 API
                const response = await fetch(`${API_BASE_URL}/members`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        name: memberName,
                        gender: memberGender,
                        age: memberAge
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || '添加成员失败');
                }

                const data = await response.json();
                console.log('成员创建成功:', data);

                // 创建成员对象并存储在本地缓存
                const member = {
                    id: data.id,
                    name: memberName,
                    gender: data.gender, // 使用后端返回的转换后性别值
                    age: memberAge
                };
                members.push(member);

                // 创建并添加成员展示元素
                const memberItem = document.createElement('div');
                memberItem.className = 'member-item';
                memberItem.innerHTML = `
                    <p>姓名: ${memberName}</p>
                    <p>性别: ${memberGender}</p>
                    <p>年龄: ${memberAge}</p>
                `;
                if (memberList) {
                    memberList.appendChild(memberItem);
                }

                // 更新小组成员选择框
                updateGroupMembers(member);

                // 添加系统通知
                if (window.notificationSystem) {
                    window.notificationSystem.addNotification(
                        'system',
                        '添加成员',
                        `成员"${memberName}"已添加到团队。`,
                        null
                    );
                }

                memberForm.reset();
                toggleForm(addMemberForm, false);
            } catch (error) {
                console.error('添加成员错误:', error);
                alert(`添加成员失败: ${error.message}`);
            }
        });
    }

    // 从数据库加载所有小组
    const loadGroups = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/groups`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('获取小组数据失败');
            }

            const data = await response.json();
            console.log('小组数据加载成功:', data);

            // 清空当前小组列表
            groups.length = 0;
            if (groupList) {
                groupList.innerHTML = '';
            }

            // 清空小组选择框
            if (taskGroupSelect) {
                // 保留第一个"选择小组"选项
                while (taskGroupSelect.options.length > 1) {
                    taskGroupSelect.remove(1);
                }
            }

            // 更新小组数组
            data.forEach(group => {
                groups.push(group);

                // 创建并添加小组展示元素
                if (groupList) {
                    const groupItem = document.createElement('div');
                    groupItem.className = 'group-item';
                    groupItem.innerHTML = `
                        <h3>${group.name}</h3>
                        <p>${group.description}</p>
                        <p>组长ID: ${group.leader_id}</p>
                    `;
                    groupList.appendChild(groupItem);
                }

                // 更新任务小组选择框
                updateTaskGroups(group);
            });
        } catch (error) {
            console.error('加载小组错误:', error);
        }
    };

    // 创建小组功能
    if (groupForm) {
        groupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const groupName = document.getElementById('group-name').value.trim();
            const groupDescription = document.getElementById('group-description').value.trim();
            const selectedMembers = Array.from(groupMembersSelect.selectedOptions).map(option => parseInt(option.value));
            const groupLeader = parseInt(document.getElementById('group-leader').value);

            if (!groupName || !groupDescription || selectedMembers.length === 0 || isNaN(groupLeader)) {
                alert('请填写所有字段并选择成员和组长！');
                return;
            }

            try {
                console.log('创建小组, 组长ID:', groupLeader, '类型:', typeof groupLeader);

                // 发送数据到后端 API创建小组
                const response = await fetch(`${API_BASE_URL}/groups`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        name: groupName,
                        description: groupDescription,
                        leader_id: groupLeader
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || '创建小组失败');
                }

                const groupData = await response.json();
                console.log('小组创建成功:', groupData);

                // 添加组员关系
                const memberResponse = await fetch(`${API_BASE_URL}/groups/${groupData.id}/members`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        memberIds: selectedMembers
                    })
                });

                if (!memberResponse.ok) {
                    console.warn('添加组员关系失败，但小组已创建');
                }

                // 创建小组对象并存储在本地缓存
                const group = {
                    id: groupData.id,
                    name: groupName,
                    description: groupDescription,
                    members: selectedMembers,
                    leader_id: groupLeader
                };
                groups.push(group);

                // 查找组长名称以便显示
                const leaderMember = members.find(m => m.id === groupLeader);
                const leaderName = leaderMember ? leaderMember.name : `ID: ${groupLeader}`;

                // 创建并添加小组展示元素
                const groupItem = document.createElement('div');
                groupItem.className = 'group-item';
                groupItem.innerHTML = `
                    <h3>${groupName}</h3>
                    <p>${groupDescription}</p>
                    <p>组长: ${leaderName}</p>
                    <p>成员数: ${selectedMembers.length}人</p>
                `;
                if (groupList) {
                    groupList.appendChild(groupItem);
                }

                // 更新任务小组选择框
                updateTaskGroups(group);

                // 添加系统通知
                if (window.notificationSystem) {
                    window.notificationSystem.addNotification(
                        'system',
                        '小组创建成功',
                        `小组"${groupName}"已成功创建，组长为${leaderName}。`,
                        null
                    );
                }

                groupForm.reset();
                toggleForm(createGroupForm, false);
            } catch (error) {
                console.error('创建小组错误:', error);
                alert(`创建小组失败: ${error.message}`);
            }
        });
    }

    // 打开任务详情模态框
    const openTaskDetails = async (taskId) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) {
            console.error(`任务 ID ${taskId} 未找到！`);
            return;
        }

        if (!taskDetailsModal || !taskDetailsTitle || !taskDetailsDescription) {
            console.error('任务详情模态框中的元素未找到！');
            return;
        }

        // 保存当前打开的任务ID
        currentTaskId = taskId;

        // 填充任务详情
        taskDetailsTitle.textContent = task.title;
        taskDetailsDescription.textContent = task.description;

        // 填充分支列表
        if (branchList) {
            branchList.innerHTML = '';
            task.branches.forEach(branch => {
                const li = document.createElement('li');
                li.innerHTML = `<strong>${branch.name}</strong>: ${branch.content}`;
                branchList.appendChild(li);
            });
        }

        // 填充合并请求列表
        if (mergeRequestsList) {
            mergeRequestsList.innerHTML = '';
            task.mergeRequests.forEach(request => {
                const li = document.createElement('li');
                li.textContent = `源分支: ${request.source}, 目标分支: ${request.target}`;
                mergeRequestsList.appendChild(li);
            });
        }

        // 填充冲突内容
        if (conflictSection && conflictList) {
            if (task.conflicts.length > 0) {
                conflictSection.style.display = 'block';
                conflictList.innerHTML = '';
                task.conflicts.forEach(conflict => {
                    const li = document.createElement('li');
                    li.textContent = conflict;
                    conflictList.appendChild(li);
                });
            } else {
                conflictSection.style.display = 'none';
            }
        }

        // 加载并填充评论列表
        try {
            // 从API获取评论
            const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/comments`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const comments = await response.json();
                console.log('评论数据加载成功:', comments);

                // 更新本地任务对象
                task.comments = comments.map(c => c.content);

                // 填充评论列表
                if (commentsList) {
                    commentsList.innerHTML = '';
                    comments.forEach(comment => {
                        const li = document.createElement('li');
                        li.innerHTML = `<strong>${comment.username || '用户'}:</strong> ${comment.content}`;
                        commentsList.appendChild(li);
                    });
                }
            } else {
                console.error('获取评论失败');
            }
        } catch (error) {
            console.error('加载评论错误:', error);
        }

        // 填充历史记录
        if (taskHistoryList) {
            taskHistoryList.innerHTML = '';
            task.history.forEach(record => {
                const li = document.createElement('li');
                li.innerHTML = `<strong>${record.time}</strong>: ${record.action} - ${record.description}`;
                taskHistoryList.appendChild(li);
            });
        }

        // 更新进度条
        if (progressBarFill) {
            progressBarFill.style.width = `${task.progressPercentage}%`;
        }

        // 显示模态框
        toggleForm(taskDetailsModal, true);

        // 绑定添加评论功能
        if (addCommentBtn && newCommentInput) {
            addCommentBtn.onclick = async () => {
                const comment = newCommentInput.value.trim();
                if (comment) {
                    try {
                        // 发送数据到后端 API
                        const response = await fetch(`${API_BASE_URL}/tasks/${task.id}/comments`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('token')}`
                            },
                            body: JSON.stringify({
                                content: comment
                            })
                        });

                        if (!response.ok) {
                            throw new Error('添加评论失败');
                        }

                        const data = await response.json();
                        console.log('评论添加成功:', data);

                        // 保存任务当前状态
                        const previousState = { ...task };

                        // 添加评论到本地数据
                        task.comments.push(comment);

                        // 添加历史记录
                        task.history.push({
                            time: new Date().toLocaleString(),
                            action: '添加评论',
                            description: comment,
                            previousState
                        });

                        // 更新UI显示
                        const li = document.createElement('li');
                        const username = data.username || '当前用户';
                        li.innerHTML = `<strong>${username}:</strong> ${comment}`;
                        commentsList.appendChild(li);

                        updateTaskDisplay(task.id);
                        newCommentInput.value = '';

                        // 发送实时更新通知
                        if (window.realtimeSystem) {
                            window.realtimeSystem.sendMessage('taskUpdate', {
                                taskId: task.id,
                                action: 'comment',
                                payload: { comment },
                                userId: 'currentUser'
                            });
                        }

                        // 添加系统通知
                        if (window.notificationSystem) {
                            window.notificationSystem.addNotification(
                                'comment',
                                '评论已添加',
                                `您已在任务"${task.title}"中添加了一条评论。`,
                                task.id
                            );
                        }
                    } catch (error) {
                        console.error('添加评论错误:', error);
                        alert('添加评论失败，请重试');
                    }
                } else {
                    alert('评论不能为空！');
                }
            };
        }

        // 绑定添加分支功能
        if (addBranchBtn && newBranchNameInput && newBranchContentInput) {
            addBranchBtn.onclick = () => {
                const branchName = newBranchNameInput.value.trim();
                const branchContent = newBranchContentInput.value.trim();
                if (branchName && branchContent) {
                    // 保存任务当前状态
                    const previousState = { ...task };

                    // 创建分支对象
                    const branch = { name: branchName, content: branchContent };

                    // 添加分支
                    task.branches.push(branch);

                    // 添加历史记录
                    task.history.push({
                        time: new Date().toLocaleString(),
                        action: '添加分支',
                        description: `创建分支: ${branchName}`,
                        previousState
                    });

                    updateTaskDisplay(taskId);
                    newBranchNameInput.value = '';
                    newBranchContentInput.value = '';

                    // 发送实时更新通知
                    if (window.realtimeSystem) {
                        window.realtimeSystem.sendMessage('taskUpdate', {
                            taskId,
                            action: 'branch',
                            payload: { branch },
                            userId: 'currentUser'
                        });
                    }

                    // 添加系统通知
                    if (window.notificationSystem) {
                        window.notificationSystem.addNotification(
                            'task',
                            '分支已创建',
                            `您已在任务"${task.title}"中创建了分支"${branchName}"。`,
                            taskId
                        );
                    }
                } else {
                    alert('分支名称和内容不能为空！');
                }
            };
        }

        // 绑定更新进度功能
        if (updateProgressBtn && progressPercentageInput) {
            updateProgressBtn.onclick = async () => {
                const progress = parseInt(progressPercentageInput.value, 10);
                if (!isNaN(progress) && progress >= 0 && progress <= 100) {
                    try {
                        const task = tasks.find(t => t.id === currentTaskId);
                        if (!task) return;

                        // 发送数据到后端 API
                        const response = await fetch(`${API_BASE_URL}/tasks/${task.id}/progress`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('token')}`
                            },
                            body: JSON.stringify({
                                progress: progress
                            })
                        });

                        if (!response.ok) {
                            throw new Error('更新任务进度失败');
                        }

                        const data = await response.json();
                        console.log('任务进度更新成功:', data);

                        // 保存任务当前状态
                        const previousState = { ...task };

                        // 更新进度
                        task.progressPercentage = progress;

                        // 如果进度为100%，标记任务为已完成
                        if (progress === 100) {
                            task.isCompleted = true;
                            task.completedAt = new Date().toLocaleString();
                        }

                        // 添加历史记录
                        task.history.push({
                            time: new Date().toLocaleString(),
                            action: '更新进度',
                            description: `进度更新为 ${progress}%`,
                            previousState
                        });

                        updateTaskDisplay(currentTaskId);

                        // 发送实时更新通知
                        if (window.realtimeSystem) {
                            window.realtimeSystem.sendMessage('taskUpdate', {
                                taskId: task.id,
                                action: 'progress',
                                payload: { progress },
                                userId: 'currentUser'
                            });
                        }

                        // 添加系统通知
                        if (window.notificationSystem) {
                            window.notificationSystem.addNotification(
                                'task',
                                '进度已更新',
                                `任务"${task.title}"的进度已更新为${progress}%。`,
                                task.id
                            );
                        }
                    } catch (error) {
                        console.error('更新任务进度错误:', error);
                        alert('更新任务进度失败: ' + error.message);
                    }
                } else {
                    alert('请输入有效的完成百分比 (0-100)！');
                }
            };
        }

        // 绑定回退功能
        if (rollbackTaskBtn) {
            rollbackTaskBtn.onclick = () => {
                if (task.history.length > 1) { // 至少保留创建记录
                    const lastRecord = task.history.pop();
                    if (lastRecord.previousState) {
                        // 恢复之前的状态
                        const restoredState = lastRecord.previousState;
                        task.branches = restoredState.branches || [];
                        task.progressPercentage = restoredState.progressPercentage || 0;
                        task.comments = restoredState.comments || [];
                        task.mergeRequests = restoredState.mergeRequests || [];
                        task.conflicts = restoredState.conflicts || [];

                        // 不恢复历史记录，保留当前历史

                        updateTaskDisplay(taskId);

                        // 刷新任务详情显示
                        openTaskDetails(taskId);

                        // 添加系统通知
                        if (window.notificationSystem) {
                            window.notificationSystem.addNotification(
                                'system',
                                '操作已回退',
                                `任务"${task.title}"已回退至上一个版本。`,
                                taskId
                            );
                        }

                        alert('任务已回退至上一个版本！');
                    }
                } else {
                    alert('没有可回退的历史记录！');
                }
            };
        }

        // 绑定合并请求功能
        if (submitMergeRequestBtn && mergeSourceBranchInput && mergeTargetBranchInput) {
            submitMergeRequestBtn.onclick = () => {
                const sourceBranch = mergeSourceBranchInput.value.trim();
                const targetBranch = mergeTargetBranchInput.value.trim();

                if (!sourceBranch || !targetBranch) {
                    alert('请填写源分支和目标分支！');
                    return;
                }

                // 检查分支是否存在
                const sourceExists = task.branches.some(branch => branch.name === sourceBranch);
                const targetExists = task.branches.some(branch => branch.name === targetBranch);

                if (!sourceExists || !targetExists) {
                    alert('源分支或目标分支不存在！');
                    return;
                }

                // 保存任务当前状态
                const previousState = { ...task };

                // 创建合并请求
                const mergeRequest = {
                    id: task.mergeRequests.length + 1,
                    source: sourceBranch,
                    target: targetBranch,
                    status: '待审核'
                };

                task.mergeRequests.push(mergeRequest);

                // 添加历史记录
                task.history.push({
                    time: new Date().toLocaleString(),
                    action: '创建合并请求',
                    description: `从 ${sourceBranch} 到 ${targetBranch}`,
                    previousState
                });

                // 刷新合并请求列表
                const li = document.createElement('li');
                li.textContent = `源分支: ${sourceBranch}, 目标分支: ${targetBranch}`;
                mergeRequestsList.appendChild(li);

                mergeSourceBranchInput.value = '';
                mergeTargetBranchInput.value = '';

                // 发送实时更新通知
                if (window.realtimeSystem) {
                    window.realtimeSystem.sendMessage('taskUpdate', {
                        taskId,
                        action: 'mergeRequest',
                        payload: { mergeRequest },
                        userId: 'currentUser'
                    });
                }

                // 添加系统通知
                if (window.notificationSystem) {
                    window.notificationSystem.addNotification(
                        'merge',
                        '合并请求已创建',
                        `已在任务"${task.title}"中创建从"${sourceBranch}"到"${targetBranch}"的合并请求。`,
                        taskId
                    );
                }

                alert('合并请求已创建！');
            };
        }

        // 添加完成任务按钮功能
        if (completeTaskBtn) {
            completeTaskBtn.onclick = async () => {
                try {
                    const task = tasks.find(t => t.id === currentTaskId);
                    if (!task || task.isCompleted) return;

                    // 发送数据到后端 API
                    const response = await fetch(`${API_BASE_URL}/tasks/${task.id}/complete`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    });

                    if (!response.ok) {
                        throw new Error('完成任务失败');
                    }

                    const data = await response.json();
                    console.log('任务完成成功:', data);

                    // 保存任务当前状态
                    const previousState = { ...task };

                    // 更新状态
                    task.isCompleted = true;
                    task.completedAt = new Date().toLocaleString();
                    task.progressPercentage = 100;

                    // 添加历史记录
                    task.history.push({
                        time: new Date().toLocaleString(),
                        action: '完成任务',
                        description: '任务已标记为完成',
                        previousState
                    });

                    // 通知依赖于此任务的后续任务
                    notifyDependentTasks(task.id);

                    // 更新UI
                    updateTaskDisplay(task.id);
                    refreshCurrentTaskDetails();

                    // 发送实时更新通知
                    if (window.realtimeSystem) {
                        window.realtimeSystem.sendMessage('taskUpdate', {
                            taskId: task.id,
                            action: 'complete',
                            userId: 'currentUser'
                        });
                    }

                    // 添加系统通知
                    if (window.notificationSystem) {
                        window.notificationSystem.addNotification(
                            'task',
                            '任务已完成',
                            `任务"${task.title}"已标记为完成。`,
                            task.id
                        );
                    }
                } catch (error) {
                    console.error('完成任务错误:', error);
                    alert('完成任务失败: ' + error.message);
                }
            };
        }

        // 添加重新开启任务按钮功能
        if (reopenTaskBtn) {
            reopenTaskBtn.onclick = async () => {
                try {
                    const task = tasks.find(t => t.id === currentTaskId);
                    if (!task || !task.isCompleted) return;

                    // 发送数据到后端 API
                    const response = await fetch(`${API_BASE_URL}/tasks/${task.id}/reopen`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    });

                    if (!response.ok) {
                        throw new Error('重新开启任务失败');
                    }

                    const data = await response.json();
                    console.log('任务重新开启成功:', data);

                    // 保存任务当前状态
                    const previousState = { ...task };

                    // 更新状态
                    task.isCompleted = false;
                    task.completedAt = null;

                    // 添加历史记录
                    task.history.push({
                        time: new Date().toLocaleString(),
                        action: '重新开启任务',
                        description: '任务已重新开启',
                        previousState
                    });

                    // 更新UI
                    updateTaskDisplay(task.id);
                    refreshCurrentTaskDetails();

                    // 发送实时更新通知
                    if (window.realtimeSystem) {
                        window.realtimeSystem.sendMessage('taskUpdate', {
                            taskId: task.id,
                            action: 'reopen',
                            userId: 'currentUser'
                        });
                    }

                    // 添加系统通知
                    if (window.notificationSystem) {
                        window.notificationSystem.addNotification(
                            'task',
                            '任务已重新开启',
                            `任务"${task.title}"已重新开启。`,
                            task.id
                        );
                    }
                } catch (error) {
                    console.error('重新开启任务错误:', error);
                    alert('重新开启任务失败: ' + error.message);
                }
            };
        }
    };

    // 更新任务展示框
    const updateTaskDisplay = (taskId) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        // 更新任务列表中的信息
        const progressElement = document.getElementById(`task-progress-${taskId}`);
        const commentsElement = document.getElementById(`task-comments-${taskId}`);
        const branchesElement = document.getElementById(`task-branches-${taskId}`);

        if (progressElement) {
            progressElement.textContent = `${task.progressPercentage}%`;
        }
        if (commentsElement) {
            commentsElement.textContent = `${task.comments.length} 条`;
        }
        if (branchesElement) {
            branchesElement.textContent = `${task.branches.length} 个`;
        }

        // 更新任务详情中的信息
        if (progressBarFill) {
            progressBarFill.style.width = `${task.progressPercentage}%`;
        }

        // 刷新分支列表
        if (branchList) {
            branchList.innerHTML = '';
            task.branches.forEach(branch => {
                const li = document.createElement('li');
                li.innerHTML = `<strong>${branch.name}</strong>: ${branch.content}`;
                branchList.appendChild(li);
            });
        }

        // 刷新评论列表
        if (commentsList) {
            commentsList.innerHTML = '';
            task.comments.forEach(comment => {
                const li = document.createElement('li');
                li.textContent = comment;
                commentsList.appendChild(li);
            });
        }

        // 刷新历史记录
        if (taskHistoryList) {
            taskHistoryList.innerHTML = '';
            task.history.forEach(record => {
                const li = document.createElement('li');
                li.innerHTML = `<strong>${record.time}</strong>: ${record.action} - ${record.description}`;
                taskHistoryList.appendChild(li);
            });
        }
    };

    // 处理实时更新中的任务详情刷新
    const refreshCurrentTaskDetails = () => {
        if (currentTaskId && taskDetailsModal.style.display !== 'none') {
            openTaskDetails(currentTaskId);
        }
    };

    // 初始化加载数据
    const initializeData = async () => {
        // 检查用户是否已登录
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn('用户未登录，无法加载数据');
            // 重定向到登录页面
            window.location.href = 'admin-login.html';
            return;
        }

        try {
            await loadMembers();
            await loadGroups();
            await loadTasks();
            console.log('数据初始化完成');

            // 初始化WebSocket连接
            initializeWebSocket();
        } catch (error) {
            console.error('数据初始化错误:', error);
        }
    };

    // 初始化WebSocket连接
    const initializeWebSocket = () => {
        const ws = new WebSocket(WS_URL);

        ws.onopen = () => {
            console.log('WebSocket连接已建立');

            // 发送认证消息
            ws.send(JSON.stringify({
                type: 'auth',
                token: localStorage.getItem('token')
            }));
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log('收到WebSocket消息:', message);

                // 处理不同类型的消息
                switch (message.type) {
                    case 'taskUpdate':
                        handleTaskUpdate(message.data);
                        break;
                    case 'notification':
                        handleNotification(message.data);
                        break;
                    default:
                        console.log('未处理的消息类型:', message.type);
                }
            } catch (error) {
                console.error('处理WebSocket消息错误:', error);
            }
        };

        ws.onclose = () => {
            console.log('WebSocket连接已关闭');
            // 尝试重新连接
            setTimeout(initializeWebSocket, 5000);
        };

        ws.onerror = (error) => {
            console.error('WebSocket错误:', error);
        };

        // 保存WebSocket连接
        window.realtimeSystem = {
            ws,
            sendMessage: (type, data) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type,
                        data
                    }));
                } else {
                    console.warn('WebSocket连接未打开，无法发送消息');
                }
            }
        };
    };

    // 处理任务更新消息
    const handleTaskUpdate = (data) => {
        const { taskId, action, payload } = data;

        // 查找任务
        const task = tasks.find(t => t.id === taskId);
        if (!task) {
            console.warn(`收到未知任务的更新消息:`, data);
            return;
        }

        // 根据动作类型处理
        switch (action) {
            case 'create':
                // 刷新任务列表
                loadTasks();
                break;
            case 'update':
            case 'progress':
                // 更新任务进度
                task.progressPercentage = payload.progress;
                updateTaskDisplay(taskId);
                break;
            case 'comment':
                // 添加评论
                task.comments.push(payload.comment);
                updateTaskDisplay(taskId);
                break;
            case 'complete':
                // 标记任务为完成
                task.isCompleted = true;
                task.completedAt = new Date().toLocaleString();
                task.progressPercentage = 100;
                updateTaskDisplay(taskId);
                break;
            case 'reopen':
                // 重新开启任务
                task.isCompleted = false;
                task.completedAt = null;
                updateTaskDisplay(taskId);
                break;
            default:
                console.warn('未处理的任务更新类型:', action);
        }

        // 如果当前查看的是此任务，刷新详情
        if (currentTaskId === taskId) {
            refreshCurrentTaskDetails();
        }
    };

    // 处理通知消息
    const handleNotification = (data) => {
        if (window.notificationSystem) {
            window.notificationSystem.addNotification(
                data.type,
                data.title,
                data.message,
                data.taskId
            );
        }
    };

    // 调用初始化函数
    initializeData();

    // 公开API，用于实时更新系统调用
    window.taskManager = {
        getTask: (taskId) => tasks.find(t => t.id === taskId),
        updateTaskDisplay,
        refreshCurrentTaskDetails,
        getTasks: () => tasks,
        getCurrentTaskId: () => currentTaskId,
        refreshData: initializeData
    };

    // 不创建模拟任务，改为从API加载
    // createTask('初始化项目', '创建项目基础结构和文档');
    // createTask('实现用户登录', '开发用户认证和授权功能');
});