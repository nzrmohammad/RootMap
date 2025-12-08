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
    // لیست کمکی برای تشخیص جنسیت در صورت نبودن در دیتا
    const femaleNames = ["گوهر", "زلیخا", "ماه آفرین", "جیران", "آفتاب", "نوشی", "ناهید", "فرانک", "رخسار", "زیور", "شهربانو", "حوری", "فاطمه", "زرین تاج", "زینب", "مملکت", "افروز", "افسر", "پروانه", "پوران", "آذر", "هما", "فریده", "پریسا", "فرزانه", "طیبه", "نجمه", "آیلار", "پروین", "پروش", "کفایت", "سارا", "رویا", "المیرا", "زهرا", "زهره", "الناز", "کبری", "سمیه", "مرضیه", "فریبا", "تهمینه", "مریم"];
    if (femaleNames.includes(name)) return 'female';
    return 'male';
}

function getAvatar(gender) {
    return gender === 'male' 
        ? 'https://cdn-icons-png.flaticon.com/512/4825/4825038.png' 
        : 'https://cdn-icons-png.flaticon.com/512/4825/4825112.png';
}

// --- 2. ساخت گراف (با نود میانی T شکل) ---

function buildGraph(data, parentId = null, level = 0, color = '#2c3e50', branchId = null) {
    const nodeId = idCounter++;
    const gender = data.gender || guessGender(data.name);
    
    if (level === 0) expandedNodes.add(nodeId);

    // 1. ساخت نود اصلی (بدون ارجاع به همسر در اینجا)
    rawNodes.push({
        id: nodeId,
        label: data.name,
        originalLabel: data.name,
        level: level,
        gender: gender,
        color: color,
        size: level === 0 ? 70 : (level === 1 ? 50 : 35),
        branch: branchId || nodeId
    });

    // اتصال به والد
    if (parentId !== null) {
        rawEdges.push({ from: parentId, to: nodeId, type: 'blood' });
    }

    // 2. بررسی و ساخت همسر (رفع ارور: همه چیز داخل این شرط است)
    if (data.children && data.children.length > 0) {
        const spouseId = idCounter++; // تعریف شناسه همسر همینجاست
        const spouseName = data.spouse || "نامشخص";
        const spouseGender = gender === 'male' ? 'female' : 'male';
        
        // ساخت نود همسر
        rawNodes.push({
            id: spouseId,
            label: spouseName,
            originalLabel: spouseName === "نامشخص" ? "همسر" : spouseName,
            level: level, // هم‌سطح با شوهر/زن
            gender: spouseGender,
            color: '#95a5a6',
            size: level === 0 ? 60 : 40,
            isSpouse: true,
            group: 'spouse_group' // کمک به دسته‌بندی
        });

        // اتصال همسر به فرد اصلی
        rawEdges.push({ from: nodeId, to: spouseId, type: 'spouse' });

        // پردازش فرزندان
        let processedChildren = data.children.map(child => {
            return typeof child === 'string' ? { name: child, gender: guessGender(child) } : { ...child, gender: child.gender || guessGender(child.name) };
        });

        processedChildren.forEach((childObj, index) => {
            let childColor = color;
            let currentBranch = branchId;
            if (level === 0) {
                childColor = branchColors[index % branchColors.length];
                currentBranch = null; 
            }
            // فرزندان به والد اصلی وصل می‌شوند
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

// --- 3. پردازش روابط برای منطق برنامه ---
rawNodes.forEach(n => relationshipMap[n.id] = { parents: [], children: [], spouses: [], marriageNodes: [] });

const marriageInfo = {}; 
rawNodes.filter(n => n.isMarriageNode).forEach(n => marriageInfo[n.id] = { parents: [], children: [] });

// --- جایگزین در بخش 3 فایل script.js ---

rawEdges.forEach(e => {
    // 1. ثبت رابطه همسری (این بخش در کد شما نبود)
    if (e.type === 'spouse') {
        if (relationshipMap[e.from]) relationshipMap[e.from].spouses.push(e.to);
        if (relationshipMap[e.to]) relationshipMap[e.to].spouses.push(e.from);
    }

    // 2. ثبت رابطه ازدواج (نود میانی)
    if (e.type === 'marriage') {
        if(marriageInfo[e.to]) marriageInfo[e.to].parents.push(e.from);
    }
    
    // 3. ثبت رابطه خونی (والد - فرزند)
    if (e.type === 'blood') {
        const fromNode = rawNodes.find(n => n.id === e.from);
        
        // اگر والد یک نود میانی ازدواج است
        if (fromNode && fromNode.isMarriageNode) {
            if(marriageInfo[e.from]) marriageInfo[e.from].children.push(e.to);
        } else {
             // اتصال مستقیم والد به فرزند (حالت استاندارد شما)
             if (relationshipMap[e.to]) relationshipMap[e.to].parents.push(e.from);
             if (relationshipMap[e.from]) relationshipMap[e.from].children.push(e.to);
        }
    }
});

Object.keys(marriageInfo).forEach(midStr => {
    const mid = parseInt(midStr);
    const info = marriageInfo[mid];
    
    info.parents.forEach(p1 => {
        relationshipMap[p1].children.push(...info.children);
        relationshipMap[p1].marriageNodes.push(mid);
        info.parents.forEach(p2 => { if(p1 !== p2) relationshipMap[p1].spouses.push(p2); });
    });

    info.children.forEach(childId => {
        relationshipMap[childId].parents.push(...info.parents);
    });
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
        const node = rawNodes.find(n => n.originalLabel === child.name);
        if(node) {
            let option = document.createElement("option"); 
            option.value = node.id; 
            option.text = `خاندان ${child.name}`; 
            option.style.color = node.color; 
            option.style.fontWeight = 'bold';
            filterSelect.appendChild(option);
        }
    });
}

rawNodes.filter(n => !n.isSpouse && !n.isMarriageNode).forEach(n => {
    let opt1 = document.createElement("option"); opt1.value = n.id; opt1.text = n.originalLabel; identitySelect.appendChild(opt1);
    let opt2 = document.createElement("option"); opt2.value = n.id; opt2.text = n.originalLabel; pathFrom.appendChild(opt2);
    let opt3 = document.createElement("option"); opt3.value = n.id; opt3.text = n.originalLabel; pathTo.appendChild(opt3);
});

// تولید HTML برای تولتیپ
function generateTooltipHTML(node) {
    if (node.isSpouse || node.isMarriageNode) return '';
    const childCount = relationshipMap[node.id] ? relationshipMap[node.id].children.length : 0;
    const imageSrc = getAvatar(node.gender);
    const spouseId = relationshipMap[node.id].spouses[0];
    const spouseName = spouseId ? rawNodes.find(n => n.id === spouseId).originalLabel : '-';
    
    // رنگ هدر بر اساس جنسیت
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
                strokeWidth: 0, vadjust: 0, bold: true 
            },
            shadow: { enabled: true, color: 'rgba(0,0,0,0.1)', size: 10, x: 5, y: 5 }
        },
        edges: {
            smooth: { type: 'cubicBezier', forceDirection: 'vertical', roundness: 0.5 },
            width: 2
        },
        layout: { 
            hierarchical: { 
                direction: "UD", sortMethod: 'hubsize', 
                nodeSpacing: 85, 
                levelSeparation: 200, 
                blockShifting: true, edgeMinimization: true,
                parentCentralization: true 
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
            if(node && !node.isSpouse && !node.isMarriageNode) {
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
    });
}

// --- جایگزین تابع getVisibleIds در script.js ---

function getVisibleIds(rootId, visibleSet = new Set()) {
    visibleSet.add(rootId);
    
    // اصلاح: همسر همیشه نمایش داده شود (مستقل از باز/بسته بودن شاخه)
    if (relationshipMap[rootId] && relationshipMap[rootId].spouses) {
        relationshipMap[rootId].spouses.forEach(spouseId => visibleSet.add(spouseId));
    }

    // شرط باز بودن فقط برای دیدن فرزندان اعمال شود
    if (expandedNodes.has(rootId)) {
        if(relationshipMap[rootId].marriageNodes) {
             relationshipMap[rootId].marriageNodes.forEach(mId => visibleSet.add(mId));
        }
        relationshipMap[rootId].children.forEach(childId => {
            getVisibleIds(childId, visibleSet); 
        });
    }
    return visibleSet;
}

function toggleBranch(nodeId) {
    const node = rawNodes.find(n => n.id === nodeId);
    if (!node || node.isSpouse || node.isMarriageNode) return; 

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
        if(relationshipMap[rootId].marriageNodes) relationshipMap[rootId].marriageNodes.forEach(m => allowedIds.add(m));
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
        };

        // 1. استایل نود میانی (نقطه اتصال ریز)
        if (n.isMarriageNode) {
            nodeObj.shape = 'dot';
            nodeObj.size = 2; // نقطه بسیار کوچک
            nodeObj.color = { background: '#555', border: '#555' };
            nodeObj.label = undefined;
            return nodeObj;
        }

        // 2. استایل افراد
        nodeObj.shape = 'circularImage';
        nodeObj.label = n.originalLabel;
        
        if (n.isSpouse) {
            nodeObj.label = n.label === "نامشخص" ? "" : n.label;
            nodeObj.color = { border: '#9ca3af', background: '#fff' };
            nodeObj.image = getAvatar(n.gender);
        } else {
            // رنگ حاشیه: آبی برای مرد، صورتی برای زن
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
        
        // ضخامت حاشیه برای دیده شدن رنگ
        nodeObj.borderWidth = 4;
        
        // هایلایت کاربر انتخاب شده در "هویت شما"
        if (currentUserId && n.id === currentUserId) {
             nodeObj.color.background = '#fef08a'; // پس‌زمینه زرد کم‌رنگ
        }

        return nodeObj;
    });

// در انتهای تابع updateView جایگزین بخش edges شود:
const newEdges = rawEdges.filter(e => allowedIds.has(e.from) && allowedIds.has(e.to)).map(e => {
    const isSpouse = e.type === 'spouse';
    return {
        from: e.from, 
        to: e.to, 
        // اگر همسر است خط‌چین، اگر فرزند است خط صاف
        dashes: isSpouse ? [5, 5] : false, 
        // رنگ متفاوت برای اتصال همسر
        color: isSpouse ? '#ef4444' : '#b0b0b0', 
        width: isSpouse ? 1.5 : 2,
        // هموارسازی خطوط
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
    if (!node || node.isMarriageNode) return;

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
    rawNodes.forEach(n => { if(!n.isMarriageNode) adj[n.id] = [] });
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
    if(relationshipMap[id].marriageNodes) res.push(...relationshipMap[id].marriageNodes);
    relationshipMap[id].children.forEach(cid => { 
        res.push(cid); 
        res.push(...getAllDescendantsIds(cid)); 
    }); 
    return res; 
}

function toggleLeftPanel() { document.getElementById('left-panel').classList.toggle('closed'); setTimeout(() => network && network.fit(), 400); }
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('closed'); setTimeout(() => network && network.fit(), 400); }
function toggleDarkMode() { document.body.classList.toggle('dark-mode'); updateView(); }
function changeLayout() { currentLayout = document.getElementById('layout-direction').value; network.setOptions({ layout: { hierarchical: { direction: currentLayout } } }); network.fit();}
function exportGraph() { const canvas = document.querySelector('#mynetwork canvas'); const link = document.createElement('a'); link.download = 'Tree.png'; link.href = canvas.toDataURL(); link.click(); }
function searchNode() { const q = document.getElementById('search').value; const t = rawNodes.find(n => n.originalLabel.includes(q)); if(t && nodes.get(t.id)) { network.selectNodes([t.id]); network.focus(t.id, {scale: 1.2, animation: true}); } }

initNetwork();