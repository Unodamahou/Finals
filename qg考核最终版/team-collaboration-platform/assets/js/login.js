// 等待 DOM 加载完成
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing login script...');

    // 获取所有必要的元素
    const elements = {
        container: document.querySelector(".container"),
        registerBtn: document.querySelector(".toggle-panel .register-btn"),
        loginBtn: document.querySelector(".toggle-panel .login-btn"),
        loginForm: document.getElementById("loginForm"),
        registerForm: document.getElementById("registerForm"),
        loginError: document.getElementById("loginError"),
        registerError: document.getElementById("registerError")
    };

    // 检查所有必要的元素是否存在
    const missingElements = Object.entries(elements)
        .filter(([key, element]) => !element)
        .map(([key]) => key);

    if (missingElements.length > 0) {
        console.error('Missing elements:', missingElements);
        return;
    }

    // 解构元素对象
    const { container, registerBtn, loginBtn, loginForm, registerForm, loginError, registerError } = elements;

    // 切换登录/注册表单
    registerBtn.addEventListener("click", () => {
        console.log('Register button clicked');
        container.classList.add("active");
    });

    loginBtn.addEventListener("click", () => {
        console.log('Login button clicked');
        container.classList.remove("active");
    });

    // 处理注册
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        console.log('Register form submitted');
        registerError.textContent = "";

        const username = document.getElementById("registerUsername").value;
        const email = document.getElementById("registerEmail").value;
        const password = document.getElementById("registerPassword").value;

        try {
            console.log('Sending register request...');
            const response = await fetch("http://localhost:3001/api/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username, email, password }),
            });

            const data = await response.json();
            console.log('Register response:', data);

            if (response.ok) {
                // 注册成功，切换到登录表单
                container.classList.remove("active");
                loginError.textContent = "注册成功，请登录";
            } else {
                registerError.textContent = data.error || "注册失败";
            }
        } catch (error) {
            console.error('Register error:', error);
            registerError.textContent = "网络错误，请稍后重试";
        }
    });

    // 处理登录
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        console.log('Login form submitted');
        loginError.textContent = "";

        const email = document.getElementById("loginEmail").value;
        const password = document.getElementById("loginPassword").value;

        try {
            console.log('Sending login request...');
            const response = await fetch("http://localhost:3001/api/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();
            console.log('Login response:', data);

            if (response.ok) {
                // 保存token到localStorage
                localStorage.setItem("token", data.token);
                localStorage.setItem("user", JSON.stringify(data.user));

                // 根据用户角色跳转到不同页面
                if (data.user.role === "admin") {
                    window.location.href = "role-selection.html";
                } else {
                    window.location.href = "role-selection.html";
                }
            } else {
                loginError.textContent = data.error || "登录失败";
            }
        } catch (error) {
            console.error('Login error:', error);
            loginError.textContent = "网络错误，请稍后重试";
        }
    });

    console.log('Login script initialized successfully');
});


