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
