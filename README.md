# 🎓 山东大学威海校区 - 教务系统一键自动评教脚本

# (SDU-WH Auto Course Evaluator)

## 📖 简介 (Introduction)

这是一个专为**山东大学威海校区**（及其他使用同类强智/青果教务系统的学校）设计的**浏览器控制台脚本**。它能够自动化完成繁琐的期末课程评价任务。

本脚本采用**非侵入式**设计（无需安装插件，直接在 Console 运行），内置**沙箱静音模式**以拦截干扰弹窗，并包含**智能防刷分逻辑**（避免所有选项完全雷同），支持从课程列表页一键全自动批量提交。

### ✨ 核心功能

* **⚡️ 极速批量处理**：在课程列表页运行一次，即可自动遍历所有未评课程。
* **🛡️ 智能防刷分**：
* **表格题**：第 1 题自动选 **B (良好)**，其余全选 **A (优秀)**，防止因分数雷同被系统判定无效。
* **单选题**：第 21 题（通常为难度/建议）自动选 **C (中等/无建议)**，其他默认选 A。


* **🔇 全域静音模式**：独创的 `Iframe Sandbox` 技术，物理屏蔽 `alert`、`confirm` 等所有弹窗，脚本运行期间零干扰。
* **🚀 自动确认提交**：自动注入逻辑劫持 `confirm` 确认框，无需人工点击“确定”，实现真正的全自动提交。
* **📝 自动评语**：内置高质量通用评语，自动填充文本框。

## 🛠️ 使用方法 (Usage)

> ⚠️ **注意**：脚本仅在电脑端浏览器（Chrome / Edge / Firefox）测试通过。

1. **登录教务系统**：进入【教学评价】->【学生评价】页面（看到课程列表的页面）。
2. **打开开发者工具**：按下键盘上的 `F12` 键（或右键点击页面 -> “检查”）。
3. **禁用调试断点** (重要)：
* 为了防止教务系统自带的 `debugger` 防调试代码卡住脚本，请务必按下 **`Ctrl + F8`** (Mac 用户按 `Cmd + \`)。
* *确认方法：开发者工具右上角的断点图标变蓝并划了一道斜杠。*


4. **运行脚本**：
* 点击开发者工具顶部的 **`Console`** (控制台) 标签。
* 复制下方（或 `script.js` 文件中）的代码，粘贴到控制台。
* 按下 **`Enter`** 回车键。


5. **等待完成**：
* 页面右下角会出现悬浮窗显示进度。
* **请勿刷新或关闭页面**，直到弹出“任务结束”的提示。
* 完成后刷新页面查看评价状态。



## 📜 脚本代码 (Script)

```javascript
(async function() {
    console.clear();
    console.log("%c 🚀 SDQU-Auto-Evaluator 启动... ", "background: #222; color: #ff5555; font-size:16px");

    // ================= 配置区 =================
    const CONFIG = {
        // 提交间隔 (毫秒)，建议保留缓冲时间
        delayTime: 2000, 
        // 自动评语内容
        comment: "课程内容充实，老师讲解透彻，重点突出，对学生很有耐心，收获很大。"
    };

    // ================= UI 悬浮窗 =================
    const statusBox = document.createElement('div');
    statusBox.style.cssText = "position:fixed; top:10px; right:10px; background:rgba(0,0,0,0.8); color:#0f0; padding:15px; z-index:99999; border-radius:5px; font-family:monospace; box-shadow:0 0 10px rgba(0,0,0,0.5); max-width: 300px; font-size:12px; pointer-events:none;";
    statusBox.innerHTML = "🤖 自动评教脚本运行中...";
    document.body.appendChild(statusBox);

    function log(msg) {
        console.log(msg);
        statusBox.innerHTML += `<br/>> ${msg}`;
        statusBox.scrollTop = statusBox.scrollHeight;
    }
    
    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    // ================= 核心逻辑 =================
    try {
        // 1. 获取所有评价链接
        let links = Array.from(document.querySelectorAll('#dataList a'))
            .filter(a => a.innerText.trim() === '评价')
            .map(a => ({
                url: a.href,
                name: a.closest('tr') ? a.closest('tr').children[3].innerText : "未知课程" 
            }));

        // 兼容 Frame 结构
        if (links.length === 0 && window.frames.length > 0) {
            function scanFrames(win) {
                try {
                    let found = Array.from(win.document.querySelectorAll('#dataList a'))
                        .filter(a => a.innerText.trim() === '评价')
                        .map(a => ({url: a.href, name: "子Frame课程"}));
                    if (found.length > 0) return found;
                    for (let i = 0; i < win.frames.length; i++) {
                        let res = scanFrames(win.frames[i]);
                        if (res.length > 0) return res;
                    }
                } catch(e){}
                return [];
            }
            links = scanFrames(window);
        }

        if (links.length === 0) {
            log("❌ 未找到评价链接！(或已全部完成)");
            return;
        }

        log(`✅ 队列中共有 ${links.length} 门课程`);

        // 2. 循环处理
        for (let i = 0; i < links.length; i++) {
            const current = links[i];
            log(`-----------------------------------`);
            log(`▶️ [${i + 1}/${links.length}] 处理: ${current.name}`);

            // 重建沙箱 iframe (物理屏蔽 alert)
            let iframe = document.getElementById('auto-eval-frame');
            if (iframe) document.body.removeChild(iframe);
            iframe = document.createElement('iframe');
            iframe.id = 'auto-eval-frame';
            iframe.style.cssText = "width:1px; height:1px; opacity:0; pointer-events:none;";
            // 禁止 allow-modals 以屏蔽 alert，禁止 allow-top-navigation 以防跳转
            iframe.setAttribute('sandbox', 'allow-forms allow-scripts allow-same-origin allow-popups'); 
            document.body.appendChild(iframe);

            try {
                iframe.src = current.url;
                
                // 等待页面加载
                await new Promise((resolve) => {
                    iframe.onload = resolve;
                    setTimeout(resolve, 6000); // 超时保护
                });
                await sleep(1000); 

                const doc = iframe.contentDocument || iframe.contentWindow.document;
                
                if (doc) {
                    // --- A. 填写表格题 ---
                    const matrixTds = doc.querySelectorAll('td[name="zbtd"]');
                    if (matrixTds.length > 0) {
                        // 先全选 A
                        matrixTds.forEach(td => {
                            const l = td.querySelectorAll('label');
                            if(l.length>0) { l[0].click(); if(l[0].querySelector('i')) l[0].querySelector('i').click(); }
                        });
                        // Q1 改选 B (防刷分)
                        const q1 = matrixTds[0].querySelectorAll('label');
                        if(q1.length>=2) { q1[1].click(); if(q1[1].querySelector('i')) q1[1].querySelector('i').click(); }
                    }

                    // --- B. 填写单选题 ---
                    const allRadios = Array.from(doc.querySelectorAll('input[type="radio"]'));
                    const processedNames = new Set();
                    allRadios.forEach(r => {
                        if(processedNames.has(r.name)) return;
                        processedNames.add(r.name);
                        
                        // 识别第21题 (通常是难度/建议)
                        if (r.name.includes('kct') || r.name === 'kctzdnd') {
                            const group = allRadios.filter(x=>x.name===r.name);
                            const t = group.find(x=>x.value==="3") || group[2]; // 选 C
                            if(t) { t.click(); if(t.parentElement.tagName==='LABEL') t.parentElement.click(); }
                        } else {
                             // 其他非表格单选，默认选 A
                             if (!doc.querySelector(`td[name="zbtd"] input[name="${r.name}"]`)) {
                                 const t = allRadios.find(x=>x.name===r.name); 
                                 if(t) { t.click(); if(t.parentElement.tagName==='LABEL') t.parentElement.click(); }
                             }
                        }
                    });

                    // --- C. 填写评语 ---
                    const ta = doc.querySelector('textarea');
                    if(ta) { ta.value = CONFIG.comment; ta.dispatchEvent(new Event('input')); }

                    // --- D. 注入强制确认补丁 ---
                    // 覆盖 iframe 内部的 confirm/alert，使其永远返回 true
                    const script = doc.createElement('script');
                    script.textContent = "window.confirm = function(){ return true; }; window.alert = function(){ return true; };";
                    doc.body.appendChild(script);

                    // --- E. 提交 ---
                    const btnSubmit = doc.getElementById('tj'); // 提交按钮 ID
                    const btnSave = doc.getElementById('bc');   // 保存按钮 ID (备用)
                    const targetBtn = btnSubmit || btnSave;

                    if(targetBtn) {
                        targetBtn.click();
                        if (targetBtn.id === 'tj') log(`   🚀 已点击提交`);
                        else log(`   💾 已点击保存`);
                        
                        // 等待提交完成 (沙箱会拦截返回的 alert)
                        await sleep(CONFIG.delayTime);
                    } else {
                        log(`   ⚠️ 未找到提交按钮`);
                    }
                }

            } catch (err) {
                // 忽略沙箱产生的安全错误 (SecurityError 是拦截成功的标志)
                if (!err.message.includes('SecurityError')) {
                    log(`   ⚠️ 提示: ${err.message}`);
                }
            }
        }

        log(`-----------------------------------`);
        log(`🎉 任务结束！`);
        log(`👉 请手动刷新页面验证结果`);
        alert("所有操作已完成，请刷新页面检查状态！");

    } catch (e) {
        console.error(e);
        alert("脚本运行出错: " + e.message);
    }
})();
```
## ⚠️ 免责声明 (Disclaimer)

* 本脚本仅供编程学习与技术交流使用。
* 请勿在非评价期间恶意攻击教务系统。
* 使用本脚本产生的任何后果（如评价结果不符合预期）由使用者自行承担。
* 建议在运行前先手动测试一门课程，确认逻辑符合当前学期的评价要求。

## 🤝 贡献 (Contribution)

如果你发现教务系统升级导致脚本失效，或者有更好的改进建议，欢迎提交 **Issue** 或 **Pull Request**。

---

**Author**: [你的名字/GitHub ID]
**License**: MIT
