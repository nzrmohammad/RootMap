// --- 1. داده‌های خاندان (ساختار درختی دقیق) ---
const genealogyData = {
    name: "سادات", gender: "male", level: 0,
    children: [
        {
            name: "گوهر", gender: "female",
            children: ["محمدحسین", "رخسار", "حسین", "هومان", "فریبرز", "بیژن"]
        },
        {
            name: "زلیخا", gender: "female",
            children: ["شکرالله", "سیف الله", "زیور", "هدایت", "کرامت", "مسیح"]
        },
        {
            name: "امیرحمزه", gender: "male",
            children: [
                {
                    name: "عطاپور", gender: "male", spouse: "فریده",
                    children: ["پریسا", "فرزانه", "طیبه", "شاهرخ", "نجمه", "آیلار", "مازیار", "مهرداد"]
                },
                {
                    name: "نوشی", gender: "female", spouse: "هومان",
                    children: ["پروین", "پروش", "کفایت", "محمد", "سارا", "مهدی"]
                },
                {
                    name: "داستان", gender: "female", spouse: "عیسی",
                    children: ["رویا", "مجتبی", "سعید", "کامران", "وحید", "المیرا", "فرزاد"]
                },
                {
                    name: "ناهید", gender: "female", spouse: "نامشخص",
                    children: ["زهرا", "مهران", "زهره", "الناز", "مهرداد"]
                },
                {
                    name: "جهانپور", gender: "male", spouse: "کبری",
                    children: ["محسن", "فرهاد", "ستار", "سالار"]
                },
                {
                    name: "بهمن", gender: "male", spouse: "فریده",
                    children: ["سمیه", "مرضیه", "میثم", "اصلان", "محمد"]
                },
                {
                    name: "فرانک", gender: "female", spouse: "فضل الله",
                    children: ["فریبا", "تهمینه", "خشایار"]
                },
                {
                    name: "خداخواست", gender: "male", spouse: "مریم",
                    children: ["سارا", "یاشار"]
                }
            ]
        },
        {
            name: "ماه آفرین", gender: "female",
            children: ["منوچهر"]
        },
        {
            name: "جیران", gender: "female",
            children: ["شهربانو", "حوری", "فرض الله", "فاطمه", "زرین تاج", "زینب", "ایرج", "مملکت", "رامین"]
        },
        {
            name: "زلزله", gender: "female",
            children: ["اسدالله", "افروز", "کرم الله", "افسر", "حبیب"]
        },
        {
            name: "امیرحسین", gender: "male",
            children: ["پروانه", "حسین", "شاپور", "هوشنگ", "پوران", "بیژن", "آذر", "هما"]
        },
        {
            name: "آفتاب", gender: "female",
            children: ["پیران", "فریده", "هومان"]
        }
    ]
};

const branchColors = ['#E57373', '#F06292', '#BA68C8', '#9575CD', '#4FC3F7', '#4DB6AC', '#81C784', '#FFD54F'];

// --- 2. توابع کمکی ---
let rawNodes = [], rawEdges = [], idCounter = 1;
// ست برای نگهداری وضعیت باز/بسته بودن نودها (شناسه نودهایی که باز هستند)
let expandedNodes = new Set(); 

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

// ساخت ساختار گراف
function buildGraph(data, parentId = null, level = 0, color = '#2c3e50', branchId = null) {
    const nodeId = idCounter++;
    const gender = data.gender || guessGender(data.name);
    
    // اگر ریشه است، به صورت پیش‌فرض باز باشد
    if (level === 0) expandedNodes.add(nodeId);

    rawNodes.push({
        id: nodeId,
        label: data.name,
        originalLabel: data.name,
        level: level,
        gender: gender,
        color: color,
        size: level === 0 ? 70 : (level === 1 ? 50 : 35),
        groupKey: level === 0 ? 'root' : (level === 1 ? 'child' : 'grandchild'),
        branch: branchId || nodeId
    });

    if (parentId !== null) {
        rawEdges.push({ from: parentId, to: nodeId, type: 'blood' });
    }

    if (data.children && data.children.length > 0) {
        const spouseId = idCounter++;
        const spouseName = data.spouse || "نامشخص";
        const spouseGender = gender === 'male' ? 'female' : 'male';
        
        rawNodes.push({
            id: spouseId,
            label: spouseName,
            originalLabel: spouseName === "نامشخص" ? "همسر" : spouseName,
            level: level,
            gender: spouseGender,
            color: '#95a5a6',
            size: level === 0 ? 60 : 40,
            groupKey: 'spouse',
            isSpouse: true
        });

        rawEdges.push({ from: nodeId, to: spouseId, type: 'spouse' });

        // مرتب‌سازی فرزندان: خانم‌ها چپ، آقایان راست
        let processedChildren = data.children.map(child => {
            return typeof child === 'string' ? { name: child, gender: guessGender(child) } : { ...child, gender: child.gender || guessGender(child.name) };
        });

        processedChildren.sort((a, b) => {
            if (a.gender === 'female' && b.gender === 'male') return -1;
            if (a.gender === 'male' && b.gender === 'female') return 1;
            return 0;
        });

        processedChildren.forEach((childObj, index) => {
            let childColor = color;
            let currentBranch = branchId;
            if (level === 0) {
                childColor = branchColors[index % branchColors.length];
                currentBranch = null; 
            }

            const expectedChildId = idCounter;
            buildGraph(childObj, nodeId, level + 1, childColor, currentBranch);
            rawEdges.push({ from: spouseId, to: expectedChildId, type: 'spouse_blood' });
        });
    }
}

buildGraph(genealogyData);

// --- 3. تنظیمات سیستم ---
let network = null, timeline = null, isDarkMode = false, currentLayout = "UD", currentUserId = null;
const relationshipMap = {};

rawNodes.forEach(n => relationshipMap[n.id] = { parents: [], children: [], spouses: [], siblings: [] });
rawEdges.forEach(e => {
    if (e.type === 'blood' || e.type === 'spouse_blood') { 
        relationshipMap[e.to].parents.push(e.from); 
        relationshipMap[e.from].children.push(e.to); 
    } else if (e.type === 'spouse') {
        relationshipMap[e.from].spouses.push(e.to); 
        relationshipMap[e.to].spouses.push(e.from); 
    }
});

const filterSelect = document.getElementById('view-filter');
const identitySelect = document.getElementById('user-identity');
const pathFrom = document.getElementById('path-from');
const pathTo = document.getElementById('path-to');

if(filterSelect) filterSelect.innerHTML = '<option value="all">نمایش کل خاندان</option>';

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

rawNodes.filter(n => !n.isSpouse).forEach(n => {
    let opt1 = document.createElement("option"); opt1.value = n.id; opt1.text = n.originalLabel; identitySelect.appendChild(opt1);
    let opt2 = document.createElement("option"); opt2.value = n.id; opt2.text = n.originalLabel; pathFrom.appendChild(opt2);
    let opt3 = document.createElement("option"); opt3.value = n.id; opt3.text = n.originalLabel; pathTo.appendChild(opt3);
});

function generateTooltipHTML(node) {
    if (node.isSpouse) return '';
    const childCount = relationshipMap[node.id] ? relationshipMap[node.id].children.length : 0;
    const imageSrc = getAvatar(node.gender);
    const spouseId = relationshipMap[node.id].spouses[0];
    const spouseName = spouseId ? rawNodes.find(n => n.id === spouseId).originalLabel : '-';

    return `
        <div class="tooltip-header" style="background:${node.color}">
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
            color: { color: '#bdc3c7', highlight: '#2563eb' },
            width: 2
        },
        layout: { 
            hierarchical: { 
                direction: currentLayout, sortMethod: 'directed', 
                nodeSpacing: 250, // افزایش فاصله افقی
                levelSeparation: 300, // افزایش فاصله عمودی
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
        
        // سینگل کلیک برای جزئیات
        network.on("click", function (params) { if (params.nodes.length > 0) handleNodeClick(params.nodes[0]); });
        
        // دابل کلیک برای باز و بسته کردن شاخه‌ها
        network.on("doubleClick", function (params) { if (params.nodes.length > 0) toggleBranch(params.nodes[0]); });
        
        updateView();
    });
}

// --- تابع هوشمند نمایش نودها بر اساس وضعیت باز/بسته بودن ---
function getVisibleIds(rootId, visibleSet = new Set()) {
    visibleSet.add(rootId);
    
    // اگر نود باز است، فرزندان و همسرش را هم نشان بده
    if (expandedNodes.has(rootId)) {
        // افزودن همسران
        relationshipMap[rootId].spouses.forEach(spouseId => visibleSet.add(spouseId));
        
        // افزودن فرزندان
        relationshipMap[rootId].children.forEach(childId => {
            getVisibleIds(childId, visibleSet); // بازگشتی برای فرزندان
        });
    }
    return visibleSet;
}

// تغییر وضعیت باز/بسته بودن
function toggleBranch(nodeId) {
    const node = rawNodes.find(n => n.id === nodeId);
    if (node.isSpouse) return; // همسر باز/بسته نمی‌شود

    const hasChildren = relationshipMap[nodeId].children.length > 0;
    if (!hasChildren) return;

    if (expandedNodes.has(nodeId)) {
        expandedNodes.delete(nodeId); // بستن
    } else {
        expandedNodes.add(nodeId); // باز کردن
    }
    updateView();
}

function updateView() {
    if(network) network.unselectAll();

    const filterValue = document.getElementById('view-filter').value;
    let allowedIds = new Set();
    
    // پیدا کردن ریشه اصلی (نظر)
    const rootId = rawNodes.find(n => n.level === 0).id;

    if (filterValue === 'all') {
        // در حالت "کل خاندان"، از سیستم باز/بسته شدن استفاده می‌کنیم
        allowedIds = getVisibleIds(rootId);
    } else {
        // در حالت فیلتر خاص، مسیر تا آن فرد + زیرمجموعه کاملش را نشان می‌دهیم
        const branchRootId = parseInt(filterValue);
        allowedIds.add(rootId);
        allowedIds.add(...relationshipMap[rootId].spouses);
        // اینجا می‌توانیم منطق مسیر را اضافه کنیم، اما برای سادگی فعلا فقط شاخه را کامل نشان می‌دهیم
        // یا می‌توانیم آن شاخه را در expandedNodes اضافه کنیم و دوباره رندر کنیم
        // فعلا حالت ساده: نمایش کامل آن شاخه
        allowedIds.add(branchRootId);
        const descendants = getAllDescendantsIds(branchRootId);
        descendants.forEach(id => allowedIds.add(id));
    }

    const newNodes = rawNodes.filter(n => allowedIds.has(n.id)).map(n => {
        let nodeObj = {
            id: n.id,
            label: n.originalLabel,
            color: { border: n.color },
            size: n.size,
            level: n.level,
            font: { background: 'rgba(255,255,255,0.9)', vadjust: 0, size: 20, bold: true },
            title: undefined 
        };

        if (n.isSpouse) {
            nodeObj.shape = 'dot';
            nodeObj.label = n.label === "نامشخص" ? "" : n.label; // اگر نامشخص بود لیبل نزن
        } else {
            nodeObj.shape = 'circularImage';
            nodeObj.image = getAvatar(n.gender);
             // علامت‌گذاری نودهایی که فرزند دارند اما بسته هستند
            const hasChildren = relationshipMap[n.id].children.length > 0;
            if (hasChildren && !expandedNodes.has(n.id) && filterValue === 'all') {
                nodeObj.label += " (+)"; // نشانگر بسته بودن
            }
        }

        if (currentUserId && n.id === currentUserId) {
            nodeObj.borderWidth = 6;
            nodeObj.color.border = '#f1c40f';
        }

        return nodeObj;
    });

    const newEdges = rawEdges.filter(e => allowedIds.has(e.from) && allowedIds.has(e.to)).map(e => ({
        from: e.from, to: e.to, 
        dashes: e.type === 'spouse',
        color: e.type === 'spouse' ? '#95a5a6' : (e.type === 'spouse_blood' ? '#e0e0e0' : '#bdc3c7'), 
        width: e.type === 'spouse' ? 1 : 2,
        hidden: false
    }));

    nodes.clear();
    edges.clear();
    nodes.add(newNodes);
    edges.add(newEdges);

    if(network) network.fit();
}

function calculatePath() { 
    const startId = parseInt(document.getElementById('path-from').value);
    const endId = parseInt(document.getElementById('path-to').value);
    const resultDiv = document.getElementById('path-result');
    if (!startId || !endId) { resultDiv.innerHTML = "لطفاً دو نفر را انتخاب کنید."; return; }
    if (startId === endId) { resultDiv.innerHTML = "هر دو نفر یکی هستند!"; return; }
    const queue = [startId]; const visited = { [startId]: true }; const parentMap = {}; let found = false;
    while (queue.length > 0) {
        const current = queue.shift(); if (current === endId) { found = true; break; }
        const data = relationshipMap[current]; const neighbors = [...data.parents, ...data.children, ...data.spouses, ...data.siblings];
        for (let nId of neighbors) { if (!visited[nId]) { visited[nId] = true; parentMap[nId] = current; queue.push(nId); } }
    }
    if (found) {
        const path = []; let curr = endId; while (curr !== startId) { path.push(curr); curr = parentMap[curr]; }
        path.push(startId); path.reverse(); highlightPath(path);
        let html = ""; for (let i = 0; i < path.length - 1; i++) { const u = rawNodes.find(n => n.id === path[i]); html += `<div style="margin-bottom:5px">🔽 ${u.originalLabel}</div>`; }
        const last = rawNodes.find(n => n.id === path[path.length-1]); html += `<div>🏁 <b>${last.originalLabel}</b></div>`; resultDiv.innerHTML = html;
    } else { resultDiv.innerHTML = "مسیری یافت نشد."; }
}

function highlightPath(pathIds) {
    network.fit({ nodes: pathIds, animation: true });
}

function handleNodeClick(nodeId) {
    const node = rawNodes.find(n => n.id === nodeId);
    if (node.isSpouse) return;

    document.getElementById('profile-card').style.display = 'block';
    document.getElementById('p-name').innerText = node.originalLabel;
    document.getElementById('p-birth').innerText = "-";
    
    const spouseId = relationshipMap[node.id].spouses[0];
    document.getElementById('p-spouse').innerText = spouseId ? rawNodes.find(n => n.id === spouseId).originalLabel : 'مجرد';
    
    const img = document.getElementById('p-img');
    img.innerHTML = `<img src="${getAvatar(node.gender)}" style="width:100%; height:100%; object-fit:cover; border-radius:50%">`;
    img.style.border = `3px solid ${node.color}`;
    const badge = document.getElementById('p-rel-badge');
    badge.innerText = "جزئیات"; badge.style.background = node.color;
    
    const sb = document.getElementById('sidebar');
    if(sb.classList.contains('closed')) sb.classList.remove('closed');
}

function updateIdentity() { 
    currentUserId = parseInt(document.getElementById('user-identity').value);
    updateView();
}

function getAllDescendantsIds(id) { 
    let res = []; 
    if(relationshipMap[id].spouses.length > 0) res.push(...relationshipMap[id].spouses);
    relationshipMap[id].children.forEach(cid => { 
        res.push(cid); 
        res.push(...getAllDescendantsIds(cid)); 
    }); 
    return res; 
}

function toggleLeftPanel() { document.getElementById('left-panel').classList.toggle('closed'); setTimeout(() => network && network.fit(), 400); }
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('closed'); setTimeout(() => network && network.fit(), 400); }
function toggleDarkMode() { isDarkMode = !isDarkMode; document.body.classList.toggle('dark-mode'); updateView(); }
function changeLayout() { currentLayout = document.getElementById('layout-direction').value; network.setOptions({ layout: { hierarchical: { direction: currentLayout } } }); network.fit();}
function exportGraph() { const canvas = document.querySelector('#mynetwork canvas'); const link = document.createElement('a'); link.download = 'Tree.png'; link.href = canvas.toDataURL(); link.click(); }
function searchNode() { const q = document.getElementById('search').value; const t = rawNodes.find(n => n.originalLabel.includes(q)); if(t && nodes.get(t.id)) { network.selectNodes([t.id]); network.focus(t.id, {scale: 1.2, animation: true}); } }

initNetwork();