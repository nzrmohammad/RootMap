// --- تنظیمات و متغیرهای سراسری ---
const branchColors = ['#E57373', '#F06292', '#BA68C8', '#9575CD', '#4FC3F7', '#4DB6AC', '#81C784', '#FFD54F'];
let rawNodes = [], rawEdges = [], idCounter = 1;
let expandedNodes = new Set(); // ست برای نگهداری وضعیت باز/بسته بودن نودها
let network = null;
let currentUserId = null;
let currentLayout = "UD";
const relationshipMap = {}; // نقشه روابط برای دسترسی سریع

// --- 1. توابع کمکی ---

function guessGender(name) {
    const femaleNames = ["گوهر", "زلیخا", "ماه آفرین", "جیران", "آفتاب", "نوشی", "ناهید", "فرانک", "رخسار", "زیور", "شهربانو", "حوری", "فاطمه", "زرین تاج", "زینب", "مملکت", "افروز", "افسر", "پروانه", "پوران", "آذر", "هما", "فریده", "پریسا", "فرزانه", "طیبه", "نجمه", "آیلار", "پروین", "پروش", "کفایت", "سارا", "رویا", "المیرا", "زهرا", "زهره", "الناز", "کبری", "سمیه", "مرضیه", "فریبا", "تهمینه", "مریم"];
    if (femaleNames.includes(name)) return 'female';
    return 'male';
}

function getAvatar(gender) {
    return gender === 'male' 
        ? 'https://cdn-icons-png.flaticon.com/512/4825/4825038.png' 
        : 'https://cdn-icons-png.flaticon.com/512/4825/4825112.png';
}

// --- 2. ساخت گراف (اصلاح شده) ---

function buildGraph(data, parentId = null, level = 0, color = '#2c3e50', branchId = null) {
    const nodeId = idCounter++;
    const gender = data.gender || guessGender(data.name);
    
    if (level === 0) expandedNodes.add(nodeId);

    // 1. ساخت نود اصلی
    rawNodes.push({
        id: nodeId,
        label: data.name,
        originalLabel: data.name,
        level: level,
        gender: gender,
        birth: data.birth, 
        death: data.death,
        color: color,
        size: level === 0 ? 70 : (level === 1 ? 50 : 35),
        branch: branchId || nodeId
    });

    // --- منطق جدید برای تعیین موقعیت چپ/راست (مرد راست، زن چپ) ---
    let bloodEdge = null;
    let ghostEdge = null;

    // تعریف رابطه خونی (والد به فرزند) - فعلاً فقط می‌سازیم، اضافه نمی‌کنیم
    if (parentId !== null) {
        bloodEdge = { from: parentId, to: nodeId, type: 'blood' };
    }

    // 2. ساخت نود همسر
    if (data.spouse && data.spouse !== "نامشخص" && data.spouse !== "") {
        const spouseId = idCounter++;
        const spouseName = data.spouse;
        const spouseGender = gender === 'male' ? 'female' : 'male';
        
        rawNodes.push({
            id: spouseId,
            label: spouseName,
            originalLabel: spouseName,
            level: level, 
            gender: spouseGender,
            color: '#95a5a6',
            size: level === 0 ? 60 : 40,
            isSpouse: true,
            group: 'spouse_group'
        });

        // اتصال همسر به فرد اصلی (خط‌چین قرمز)
        rawEdges.push({ from: nodeId, to: spouseId, type: 'spouse' });

        // تعریف رابطه نامرئی (والد به همسر فرزند)
        if (parentId !== null) {
            ghostEdge = { 
                from: parentId, 
                to: spouseId, 
                type: 'ghost', // نوع جدید
                physics: false 
            };
        }
    }

    // --- اعمال هوشمندانه ترتیب اتصال‌ها ---
    // در Vis.js معمولاً گره‌هایی که زودتر متصل می‌شوند به سمت چپ متمایل می‌شوند.
    
    if (gender === 'male') {
        // اگر فرد اصلی "مرد" است:
        // ۱. اول اتصال همسرش (زن) را ثبت می‌کنیم (تا برود سمت چپ)
        if (ghostEdge) rawEdges.push(ghostEdge);
        // ۲. بعد اتصال خود مرد را ثبت می‌کنیم (تا برود سمت راست)
        if (bloodEdge) rawEdges.push(bloodEdge);
    } else {
        // اگر فرد اصلی "زن" است:
        // ۱. اول اتصال خود زن را ثبت می‌کنیم (تا برود سمت چپ)
        if (bloodEdge) rawEdges.push(bloodEdge);
        // ۲. بعد اتصال همسرش (مرد) را ثبت می‌کنیم (تا برود سمت راست)
        if (ghostEdge) rawEdges.push(ghostEdge);
    }

    // 3. پردازش فرزندان
    if (data.children && data.children.length > 0) {
        let processedChildren = data.children.map(child => {
            return typeof child === 'string' ? { name: child, gender: guessGender(child) } : { ...child, gender: child.gender || guessGender(child.name) };
        });

        // نکته مهم: لیست معکوس می‌شود تا فرزند اول در سمت راست قرار گیرد (برای حالت RTL)
        processedChildren.reverse().forEach((childObj, index) => {
            let childColor = color;
            let currentBranch = branchId;
            
            if (level === 0) {
                childColor = branchColors[index % branchColors.length];
                currentBranch = null; 
            }
            buildGraph(childObj, nodeId, level + 1, childColor, currentBranch);
        });
    }
}

// بررسی وجود دیتا قبل از اجرا
if (typeof genealogyData !== 'undefined') {
    buildGraph(genealogyData);
} else {
    alert("خطا: فایل data.js بارگذاری نشده است!");
}

// --- 3. پردازش روابط برای منطق برنامه (ساده‌سازی شده) ---
// مقداردهی اولیه مپ
rawNodes.forEach(n => relationshipMap[n.id] = { parents: [], children: [], spouses: [] });

rawEdges.forEach(e => {
    // ثبت رابطه همسری
    if (e.type === 'spouse') {
        if (relationshipMap[e.from]) relationshipMap[e.from].spouses.push(e.to);
        if (relationshipMap[e.to]) relationshipMap[e.to].spouses.push(e.from);
    }

    // ثبت رابطه خونی (والد - فرزند)
    if (e.type === 'blood') {
        // اتصال مستقیم والد به فرزند
        if (relationshipMap[e.to]) relationshipMap[e.to].parents.push(e.from);
        if (relationshipMap[e.from]) relationshipMap[e.from].children.push(e.to);
    }
});

// --- 4. رابط کاربری و Vis.js ---

// پر کردن لیست‌های کشویی
const filterSelect = document.getElementById('view-filter');
const identitySelect = document.getElementById('user-identity');
const pathFrom = document.getElementById('path-from');
const pathTo = document.getElementById('path-to');

if(filterSelect && typeof genealogyData !== 'undefined') {
    filterSelect.innerHTML = '<option value="all">نمایش کل خاندان</option>';
    genealogyData.children.forEach(child => {
        // پیدا کردن نود مربوط به سرشاخه
        const node = rawNodes.find(n => n.originalLabel === (typeof child === 'string' ? child : child.name));
        if(node) {
            let option = document.createElement("option"); 
            option.value = node.id; 
            option.text = `خاندان ${node.originalLabel}`; 
            option.style.color = node.color; 
            option.style.fontWeight = 'bold';
            filterSelect.appendChild(option);
        }
    });
}

// پر کردن لیست‌ها با افراد اصلی (غیر همسر)
rawNodes.filter(n => !n.isSpouse).forEach(n => {
    let opt1 = document.createElement("option"); opt1.value = n.id; opt1.text = n.originalLabel; identitySelect.appendChild(opt1);
    let opt2 = document.createElement("option"); opt2.value = n.id; opt2.text = n.originalLabel; pathFrom.appendChild(opt2);
    let opt3 = document.createElement("option"); opt3.value = n.id; opt3.text = n.originalLabel; pathTo.appendChild(opt3);
});

// تولید HTML برای تولتیپ
function generateTooltipHTML(node) {
    if (node.isSpouse) return '';
    const childCount = relationshipMap[node.id] ? relationshipMap[node.id].children.length : 0;
    const imageSrc = getAvatar(node.gender);
    const spouseId = relationshipMap[node.id].spouses[0];
    const spouseName = spouseId ? rawNodes.find(n => n.id === spouseId).originalLabel : '-';
    
    const genderColor = node.gender === 'male' ? '#2563eb' : '#e11d48';

    return `
        <div class="tooltip-header" style="background:${genderColor}">
            <img src="${imageSrc}" class="tooltip-img">
            <div class="tooltip-title">${node.originalLabel}</div>
        </div>
        <div class="tooltip-body">
            <div class="t-row"><i class="fas fa-venus-mars"></i> <span>${node.gender === 'male' ? 'مرد' : 'زن'}</span></div>
            <div class="t-row"><i class="fas fa-ring"></i> <span>همسر: ${spouseName}</span></div>
            <div class="t-row"><i class="fas fa-child"></i> <span>تعداد فرزند: ${childCount}</span></div>
            <div class="t-badge" style="background:${node.color}20; color:${node.color}">
                ${node.level === 0 ? 'ریشه خاندان' : node.level === 1 ? 'فرزند ارشد' : 'نوه'}
            </div>
            <div style="font-size:0.7em; margin-top:5px; color:#666; text-align:center;">(دابل کلیک برای باز/بسته کردن)</div>
        </div>`;
}

// راه‌اندازی شبکه
const nodes = new vis.DataSet([]);
const edges = new vis.DataSet([]);

function initNetwork() {
    const container = document.getElementById('mynetwork');
    const data = { nodes: nodes, edges: edges };
    
    const options = {
        nodes: {
            borderWidth: 4, 
            color: { border: '#fff', background: '#fff', highlight: { border: '#2563eb', background: '#fff' } },
            font: { 
                face: 'Vazirmatn', size: 20, color: '#000000', 
                background: 'rgba(255, 255, 255, 0.9)', 
                strokeWidth: 0, vadjust: 0,
                bold: { size: 20, color: '#000000', mod: 'bold' } // <--- اصلاح شده
            },
            shadow: { enabled: true, color: 'rgba(0,0,0,0.1)', size: 10, x: 5, y: 5 }
        },
        edges: {
            smooth: { type: 'cubicBezier', forceDirection: 'vertical', roundness: 0.5 },
            width: 2
        },
        layout: { 
            hierarchical: { 
                direction: "UD", 
                sortMethod: 'directed', // تغییر برای نظم بهتر
                nodeSpacing: 180,       // افزایش فاصله افقی
                levelSeparation: 150,   // افزایش فاصله عمودی
                blockShifting: true, 
                edgeMinimization: true,
                parentCentralization: true,
                shakeTowards: 'roots'
            } 
        },
        physics: false,
        interaction: { hover: true, dragNodes: true, tooltipDelay: 0, zoomView: true }
    };

    document.fonts.ready.then(function () {
        network = new vis.Network(container, data, options);
        
        network.on("afterDrawing", function() {
             const loader = document.getElementById('loading-screen');
             if(loader) { loader.style.opacity = '0'; setTimeout(() => loader.style.display = 'none', 500); }
        });
        
        const tooltipEl = document.getElementById('custom-tooltip');
        
        network.on("hoverNode", function (params) {
            const nodeId = params.node;
            const node = rawNodes.find(n => n.id === nodeId);
            if(node && !node.isSpouse) {
                tooltipEl.innerHTML = generateTooltipHTML(node);
                tooltipEl.style.display = 'block';
                const nodePosition = network.getPositions([nodeId])[nodeId];
                const domPosition = network.canvasToDOM(nodePosition);
                tooltipEl.style.left = domPosition.x + 'px';
                tooltipEl.style.top = (domPosition.y - 45) + 'px';
            }
        });

        network.on("blurNode", function () { tooltipEl.style.display = 'none'; });
        network.on("dragStart", () => tooltipEl.style.display = 'none');
        network.on("zoom", () => tooltipEl.style.display = 'none');
        
        network.on("click", function (params) { 
            if (params.nodes.length > 0) handleNodeClick(params.nodes[0]); 
        });
        
        network.on("doubleClick", function (params) { 
            if (params.nodes.length > 0) toggleBranch(params.nodes[0]); 
        });
        
        updateView();
        updateDashboard();
    });
}

function getVisibleIds(rootId, visibleSet = new Set()) {
    visibleSet.add(rootId);
    
    // همسر همیشه نمایش داده شود
    if (relationshipMap[rootId] && relationshipMap[rootId].spouses) {
        relationshipMap[rootId].spouses.forEach(spouseId => visibleSet.add(spouseId));
    }

    // شرط باز بودن فقط برای دیدن فرزندان اعمال شود
    if (expandedNodes.has(rootId)) {
        relationshipMap[rootId].children.forEach(childId => {
            getVisibleIds(childId, visibleSet); 
        });
    }
    return visibleSet;
}

function toggleBranch(nodeId) {
    const node = rawNodes.find(n => n.id === nodeId);
    if (!node || node.isSpouse) return; 

    const hasChildren = relationshipMap[nodeId].children.length > 0;
    if (!hasChildren) return;

    if (expandedNodes.has(nodeId)) {
        expandedNodes.delete(nodeId); 
    } else {
        expandedNodes.add(nodeId); 
    }
    updateView();
}

// به‌روزرسانی گرافیک
function updateView() {
    if(network) network.unselectAll();

    const filterValue = document.getElementById('view-filter') ? document.getElementById('view-filter').value : 'all';
    let allowedIds = new Set();
    const rootId = rawNodes.find(n => n.level === 0).id;

    if (filterValue === 'all') {
        allowedIds = getVisibleIds(rootId);
    } else {
        const branchRootId = parseInt(filterValue);
        allowedIds.add(rootId);
        relationshipMap[rootId].spouses.forEach(s => allowedIds.add(s));
        
        allowedIds.add(branchRootId);
        const descendants = getAllDescendantsIds(branchRootId);
        descendants.forEach(id => allowedIds.add(id));
    }

    const newNodes = rawNodes.filter(n => allowedIds.has(n.id)).map(n => {
        let nodeObj = {
            id: n.id,
            level: n.level,
            font: { background: 'rgba(255,255,255,0.9)', vadjust: 0, size: 20, bold: true },
            shape: 'circularImage',
            label: n.originalLabel
        };

        if (n.isSpouse) {
            nodeObj.label = n.label === "نامشخص" ? "" : n.label;
            nodeObj.color = { border: '#9ca3af', background: '#fff' };
            nodeObj.image = getAvatar(n.gender);
        } else {
            if (n.gender === 'male') {
                nodeObj.color = { border: '#2563eb', background: '#fff' };
            } else {
                nodeObj.color = { border: '#e11d48', background: '#fff' }; 
            }
            nodeObj.image = getAvatar(n.gender);

            const hasChildren = relationshipMap[n.id].children.length > 0;
            if (hasChildren && !expandedNodes.has(n.id) && filterValue === 'all') {
                nodeObj.label += " (+)";
            }
        }
        
        nodeObj.borderWidth = 4;
        
        if (currentUserId && n.id === currentUserId) {
             nodeObj.color.background = '#fef08a';
        }

        return nodeObj;
    });

    const newEdges = rawEdges.filter(e => allowedIds.has(e.from) && allowedIds.has(e.to)).map(e => {
        const isSpouse = e.type === 'spouse';
        const isGhost = e.type === 'ghost'; 

        return {
            from: e.from, 
            to: e.to, 
            // اگر گوست است، رنگش شفاف شود (نامرئی) ولی خط وجود داشته باشد
            color: isGhost ? 'rgba(0,0,0,0)' : (isSpouse ? '#ef4444' : '#b0b0b0'), 
            // نکته مهم: اینجا دیگر hidden را true نمی‌کنیم
            dashes: isSpouse ? [5, 5] : false, 
            width: isSpouse ? 1.5 : 2,
            hoverWidth: 0, // وقتی موس رفت روش هم دیده نشود
            smooth: {
                type: isSpouse ? 'continuous' : 'cubicBezier',
                forceDirection: 'vertical',
                roundness: 0.6
            }
        };
    });

    nodes.clear();
    edges.clear();
    nodes.add(newNodes);
    edges.add(newEdges);

    if(network) network.fit();
}

function handleNodeClick(nodeId) {
    const node = rawNodes.find(n => n.id === nodeId);
    if (!node) return;

    document.getElementById('profile-card').style.display = 'block';
    document.getElementById('p-name').innerText = node.originalLabel;
    document.getElementById('p-birth').innerText = "-";
    
    const spouseId = relationshipMap[node.id].spouses[0];
    document.getElementById('p-spouse').innerText = spouseId ? rawNodes.find(n => n.id === spouseId).originalLabel : 'مجرد';
    
    const img = document.getElementById('p-img');
    const borderColor = node.gender === 'male' ? '#2563eb' : '#e11d48';
    img.innerHTML = `<img src="${getAvatar(node.gender)}" style="width:100%; height:100%; object-fit:cover; border-radius:50%">`;
    img.style.border = `4px solid ${borderColor}`;
    const badge = document.getElementById('p-rel-badge');
    badge.innerText = "جزئیات"; badge.style.background = node.color;
    
    const sb = document.getElementById('sidebar');
    if(sb.classList.contains('closed')) sb.classList.remove('closed');
}

// توابع تعاملی (مسیریابی، جستجو و ...)
function calculatePath() { 
    const startId = parseInt(document.getElementById('path-from').value);
    const endId = parseInt(document.getElementById('path-to').value);
    const resultDiv = document.getElementById('path-result');
    
    if (!startId || !endId) { resultDiv.innerHTML = "لطفاً دو نفر را انتخاب کنید."; return; }
    if (startId === endId) { resultDiv.innerHTML = "هر دو نفر یکی هستند!"; return; }
    
    const queue = [startId]; const visited = { [startId]: true }; const parentMap = {}; let found = false;
    
    // ساخت گراف ساده برای مسیریابی
    const adj = {};
    rawNodes.forEach(n => { adj[n.id] = [] });
    Object.keys(relationshipMap).forEach(key => {
        const id = parseInt(key);
        const d = relationshipMap[id];
        [...d.parents, ...d.children, ...d.spouses].forEach(neighbor => {
            if(adj[id]) adj[id].push(neighbor);
        });
    });

    while (queue.length > 0) {
        const current = queue.shift(); 
        if (current === endId) { found = true; break; }
        if(adj[current]) {
            for (let nId of adj[current]) { 
                if (!visited[nId]) { visited[nId] = true; parentMap[nId] = current; queue.push(nId); } 
            }
        }
    }

    if (found) {
        const path = []; let curr = endId; while (curr !== startId) { path.push(curr); curr = parentMap[curr]; }
        path.push(startId); path.reverse(); 
        network.fit({ nodes: path, animation: true });
        let html = ""; 
        for (let i = 0; i < path.length - 1; i++) { 
            const u = rawNodes.find(n => n.id === path[i]); 
            html += `<div style="margin-bottom:5px">🔽 ${u.originalLabel}</div>`; 
        }
        const last = rawNodes.find(n => n.id === path[path.length-1]); 
        html += `<div>🏁 <b>${last.originalLabel}</b></div>`; 
        resultDiv.innerHTML = html;
    } else { resultDiv.innerHTML = "مسیری یافت نشد."; }
}

function updateIdentity() { 
    currentUserId = parseInt(document.getElementById('user-identity').value);
    updateView();
}

function getAllDescendantsIds(id) { 
    let res = []; 
    relationshipMap[id].spouses.forEach(s => res.push(s));
    relationshipMap[id].children.forEach(cid => { 
        res.push(cid); 
        res.push(...getAllDescendantsIds(cid)); 
    }); 
    return res; 
}

function toggleLeftPanel() { document.getElementById('left-panel').classList.toggle('closed'); setTimeout(() => network && network.fit(), 400); }
// جایگزین تابع toggleSidebar قبلی در فایل script.js
function toggleSidebar() {
    const sb = document.getElementById('sidebar');
    
    // اگر کلاس بسته دارد -> بازش کن
    if (sb.classList.contains('closed')) {
        sb.classList.remove('closed');
        sb.classList.add('open');
    } 
    // اگر کلاس باز دارد -> ببندش
    else if (sb.classList.contains('open')) {
        sb.classList.remove('open');
        sb.classList.add('closed');
    } 
    // اگر هیچ کلاسی ندارد (حالت اولیه):
    else {
        // اگر در موبایل هستیم: پیش‌فرض بسته است، پس بازش کن
        if (window.innerWidth <= 768) {
            sb.classList.add('open');
        } 
        // اگر در دسکتاپ هستیم: پیش‌فرض باز است، پس ببندش
        else {
            sb.classList.add('closed');
        }
    }
    
    // تنظیم مجدد گراف
    setTimeout(() => network && network.fit(), 400);
}
function toggleDarkMode() { document.body.classList.toggle('dark-mode'); updateView(); }
function changeLayout() { currentLayout = document.getElementById('layout-direction').value; network.setOptions({ layout: { hierarchical: { direction: currentLayout } } }); network.fit();}
// این تابع را جایگزین function exportGraph() در انتهای فایل script.js کنید
function exportHighQuality() {
    const container = document.getElementById('mynetwork');
    const canvas = container.querySelector('canvas');
    
    // ذخیره وضعیت فعلی برای بازگرداندن بعد از عکس گرفتن
    const currentScale = network.getScale();
    const currentPosition = network.getViewPosition();
    
    // بزرگنمایی برای کیفیت بهتر (مثلاً ۲ برابر)
    network.fit({
        animation: false
    });
    
    // کمی صبر برای رندر شدن (ایمن‌سازی)
    setTimeout(() => {
        const imageUrl = canvas.toDataURL("image/png", 1.0); // کیفیت ماکزیمم
        
        const link = document.createElement('a');
        link.download = 'FamilyTree-HD.png';
        link.href = imageUrl;
        link.click();
        
        // بازگشت به حالت زوم قبلی کاربر
        network.moveTo({
            position: currentPosition,
            scale: currentScale,
            animation: false
        });
    }, 500);
}
function searchNode() { const q = document.getElementById('search').value; const t = rawNodes.find(n => n.originalLabel.includes(q)); if(t && nodes.get(t.id)) { network.selectNodes([t.id]); network.focus(t.id, {scale: 1.2, animation: true}); } }

// --- 5. تنظیمات و توابع تایم‌لاین ---

let timeline = null;

function initTimeline() {
    const container = document.getElementById('mytimeline');
    const items = new vis.DataSet();
    
    // تابع بازگشتی برای استخراج داده‌های تاریخ‌دار
    function extractDates(node) {
        // اگر سال تولد دارد، اضافه کن
        if (node.birth) {
            items.add({
                id: node.id, // شناسه باید با شناسه گراف یکی باشد
                content: node.name || node.label,
                start: String(node.birth), // سال تولد
                end: node.death ? String(node.death) : new Date().getFullYear().toString(), // اگر فوت کرده سال وفات، وگرنه سال جاری
                type: 'range', // به صورت بازه زمانی
                className: node.gender === 'male' ? 'timeline-male' : 'timeline-female' // کلاس برای رنگ‌بندی
            });
        }
        
        // بررسی فرزندان
        if (node.children) {
            node.children.forEach(child => {
                // چون ساختار children در دیتا متفاوت است (رشته یا آبجکت)، باید استاندارد شود
                // اما چون ما در buildGraph به rawNodes شناسه دادیم، بهتر است از rawNodes استفاده کنیم
            });
        }
    }

    // روش بهتر: استفاده از rawNodes که قبلاً ساخته‌ایم و همه داده‌ها را دارد
    rawNodes.forEach(node => {
        // پیدا کردن دیتای اصلی از روی label (چون rawNodes همه فیلدها را ندارد، باید مپ کنیم)
        // اما ساده‌تر این است که دستی در rawNodes تاریخ را هم ذخیره کنیم.
        // بیایید تابع buildGraph را کمی اصلاح کنیم که birth/death را هم نگه دارد.
        // (راه حل موقت: فرض میکنیم در rawNodes ذخیره شده است - به مرحله ۳ دقت کنید)
        
        if (node.birth) {
            items.add({
                id: node.id,
                content: node.originalLabel,
                start: String(node.birth), // تبدیل سال شمسی به رشته برای Vis
                end: node.death ? String(node.death) : (new Date().toLocaleDateString('fa-IR-u-nu-latn').split('/')[0]), // سال جاری شمسی تقریبی
                type: node.death ? 'range' : 'point', // اگر زنده است نقطه باشد یا بازه باز
                style: `background-color: ${node.gender === 'male' ? '#bfdbfe' : '#fecdd3'}; border-color: ${node.gender === 'male' ? '#2563eb' : '#e11d48'}; font-size: 12px; border-radius: 5px;`
            });
        }
    });

    const options = {
        height: '100%',
        minHeight: '150px',
        start: '1300', // شروع پیش‌فرض نمودار
        end: '1410',   // پایان پیش‌فرض
        rtl: true,     // جهت راست به چپ
        orientation: 'top'
    };

    if (items.length > 0) {
        timeline = new vis.Timeline(container, items, options);
        
        // وقتی روی تایم‌لاین کلیک شد، در گراف هم انتخاب شود
        timeline.on('select', function (properties) {
            if(properties.items.length > 0) {
                const selectedId = properties.items[0];
                network.selectNodes([selectedId]);
                network.focus(selectedId, { scale: 1.2, animation: true });
                handleNodeClick(selectedId); // نمایش اطلاعات در سایدبار
            }
        });
    } else {
        container.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">تاریخ تولدی ثبت نشده است.</div>';
    }
}

// --- تابع محاسبه و نمایش آمار داشبورد ---
function updateDashboard() {
    // 1. آمار کلی (کارت اول)
    const totalPop = rawNodes.length;
    // پیدا کردن بیشترین سطح (Level) برای تعداد نسل
    const maxLevel = rawNodes.length > 0 ? Math.max(...rawNodes.map(n => n.level)) + 1 : 0;
    // تعداد ازدواج‌ها (تعداد یال‌های از نوع spouse)
    const totalMarriages = rawEdges.filter(e => e.type === 'spouse').length;

    document.getElementById('stat-total').innerText = totalPop;
    document.getElementById('stat-gens').innerText = maxLevel;
    document.getElementById('stat-marriages').innerText = totalMarriages;

    // 2. آمار تحلیلی (کارت دوم - جدید)
    
    // الف) میانگین فرزند: (کل روابط خونی / تعداد افرادی که والد هستند)
    const bloodEdges = rawEdges.filter(e => e.type === 'blood');
    const parentCount = new Set(bloodEdges.map(e => e.from)).size;
    const avgChild = parentCount > 0 ? (bloodEdges.length / parentCount).toFixed(1) : 0;
    document.getElementById('stat-avg-child').innerText = avgChild;

    // ب) نسبت جنسیتی
    const males = rawNodes.filter(n => n.gender === 'male').length;
    const females = rawNodes.filter(n => n.gender === 'female').length;
    const mPercent = totalPop > 0 ? Math.round((males / totalPop) * 100) : 0;
    const fPercent = totalPop > 0 ? Math.round((females / totalPop) * 100) : 0;
    document.getElementById('stat-gender-ratio').innerText = `${mPercent}% - ${fPercent}%`;

    // ج) نام پرتکرار
    const nameMap = {};
    rawNodes.forEach(n => {
        // حذف پیشوند/پسوندها برای دقت بیشتر (اختیاری)
        const cleanName = n.originalLabel.trim();
        nameMap[cleanName] = (nameMap[cleanName] || 0) + 1;
    });
    
    let topName = "-";
    let maxCount = 0;
    for (const [name, count] of Object.entries(nameMap)) {
        if (count > maxCount) {
            maxCount = count;
            topName = name;
        }
    }
    // اگر تکراری وجود داشت نشان بده، وگرنه خط تیره
    document.getElementById('stat-top-name').innerText = maxCount > 1 ? `${topName} (${maxCount})` : "تکراری نداریم";
}

// دکمه نمایش/مخفی کردن تایم‌لاین
function toggleTimeline() {
    const container = document.getElementById('timeline-container');
    container.classList.toggle('timeline-hidden');
    
    // اگر بار اول است و باز شده، تایم‌لاین را بساز
    if (!container.classList.contains('timeline-hidden') && !timeline) {
        initTimeline();
    }
}

initNetwork();