// --- 1. داده‌ها ---
const branchColors = ['#E57373', '#F06292', '#BA68C8', '#9575CD', '#4FC3F7', '#4DB6AC', '#81C784', '#FFD54F'];
const rootFather = { name: "امیرحمزه نظری", gender: "male", birth: 1300 };
const rootMother = { name: "ماه‌خاور رستگار", gender: "female", birth: 1305 };

const rootRelatives = [
    { id: 101, name: "کرم نظری (برادر امیر)", gender: "male", birth: 1298, relatedTo: "father", spouse: { name: "بانو زری", gender: "female", birth: 1302 } },
    { id: 102, name: "گل‌بس رستگار (خواهر ماه‌خاور)", gender: "female", birth: 1310, relatedTo: "mother", spouse: { name: "آقا رضا", gender: "male", birth: 1308 } }
];

const childrenList = [
    { name: "عطاپور", gender: "male", birth: 1325 }, { name: "نوشی", gender: "female", birth: 1328 },
    { name: "داستان", gender: "male", birth: 1332 }, { name: "ناهید", gender: "female", birth: 1336 },
    { name: "جهانپور", gender: "male", birth: 1340 }, { name: "بهمن", gender: "male", birth: 1344 },
    { name: "فرانک", gender: "female", birth: 1347 }, { name: "خداخواست", gender: "male", birth: 1350 }
];

const GRANDCHILDREN_PER_CHILD = 4;

// --- 2. تولید نودها ---
let rawNodes = [], rawEdges = [], idCounter = 1;

// ریشه
const fatherId = idCounter++, motherId = idCounter++;
rawNodes.push({ id: fatherId, label: rootFather.name, level: 0, gender: "male", originalLabel: rootFather.name, birth: rootFather.birth, color: '#34495e', size: 40, groupKey: 'main', spouseName: rootMother.name });
rawNodes.push({ id: motherId, label: rootMother.name, level: 0, gender: "female", originalLabel: rootMother.name, birth: rootMother.birth, color: '#34495e', size: 40, groupKey: 'main', spouseName: rootFather.name });
rawEdges.push({ from: fatherId, to: motherId, type: "spouse" });

// اقوام
rootRelatives.forEach(rel => {
    const relId = idCounter++, spouseId = idCounter++;
    rawNodes.push({ id: relId, label: rel.name, level: 0, gender: rel.gender, originalLabel: rel.name, birth: rel.birth, color: '#7f8c8d', size: 30, groupKey: 'relative', spouseName: rel.spouse.name });
    rawNodes.push({ id: spouseId, label: rel.spouse.name, level: 0, gender: rel.spouse.gender, originalLabel: rel.spouse.name, birth: rel.spouse.birth, color: '#95a5a6', size: 30, groupKey: 'relative', spouseName: rel.name });
    rawEdges.push({ from: relId, to: spouseId, type: "spouse" });
    if(rel.relatedTo === 'father') rawEdges.push({ from: fatherId, to: relId, type: "sibling_link" });
    else rawEdges.push({ from: motherId, to: relId, type: "sibling_link" });
});

// فرزندان و نوه‌ها
childrenList.forEach((child, index) => {
    const childId = idCounter++;
    const myColor = branchColors[index % branchColors.length];
    rawNodes.push({ id: childId, label: child.name, level: 1, gender: child.gender, originalLabel: child.name, birth: child.birth, color: myColor, size: 25, branch: childId, groupKey: 'child' });
    rawEdges.push({ from: fatherId, to: childId, type: "child" });
    rawEdges.push({ from: motherId, to: childId, type: "child" });
    for (let i = 1; i <= GRANDCHILDREN_PER_CHILD; i++) {
        const gcId = idCounter++;
        const gcName = `فرزند ${i}ِ ${child.name}`;
        const gcGender = Math.random() > 0.5 ? "male" : "female";
        const gcBirth = child.birth + 25 + Math.floor(Math.random() * 10);
        rawNodes.push({ id: gcId, label: gcName, level: 2, gender: gcGender, originalLabel: gcName, birth: gcBirth, color: myColor, size: 15, branch: childId, groupKey: 'grandchild' });
        rawEdges.push({ from: childId, to: gcId, type: "child" });
    }
});

// --- 3. تنظیمات سیستم ---
let network = null, timeline = null, isDarkMode = false, currentLayout = "UD", currentUserId = null;
const relationshipMap = {};
rawNodes.forEach(n => relationshipMap[n.id] = { parents: [], children: [], spouses: [], siblings: [] });
rawEdges.forEach(e => {
    if (e.type === 'child') { relationshipMap[e.to].parents.push(e.from); relationshipMap[e.from].children.push(e.to); }
    else if (e.type === 'spouse') { relationshipMap[e.from].spouses.push(e.to); relationshipMap[e.to].spouses.push(e.from); }
    else if (e.type === 'sibling_link') { relationshipMap[e.from].siblings.push(e.to); relationshipMap[e.to].siblings.push(e.from); }
});
rawNodes.forEach(n => {
    const parents = relationshipMap[n.id].parents;
    if (parents.length > 0) {
        const siblings = parents.flatMap(p => relationshipMap[p].children).filter(id => id !== n.id);
        relationshipMap[n.id].siblings.push(...[...new Set(siblings)]);
    }
});

// پر کردن منوها
const filterSelect = document.getElementById('view-filter');
const identitySelect = document.getElementById('user-identity');
const pathFrom = document.getElementById('path-from');
const pathTo = document.getElementById('path-to');

childrenList.forEach(child => {
    const node = rawNodes.find(n => n.originalLabel === child.name);
    let option = document.createElement("option"); option.value = node.id; option.text = `شاخهِ ${child.name}`; option.style.color = node.color; option.style.fontWeight = 'bold';
    filterSelect.appendChild(option);
});

// پر کردن لیست افراد (برای هویت و محاسبه‌گر)
rawNodes.forEach(n => {
    let opt1 = document.createElement("option"); opt1.value = n.id; opt1.text = n.originalLabel; identitySelect.appendChild(opt1);
    let opt2 = document.createElement("option"); opt2.value = n.id; opt2.text = n.originalLabel; pathFrom.appendChild(opt2);
    let opt3 = document.createElement("option"); opt3.value = n.id; opt3.text = n.originalLabel; pathTo.appendChild(opt3);
});

// تابع ساخت تولتیپ
function generateTooltip(node) {
    const container = document.createElement("div");
    container.style.cssText = "padding:8px; text-align:right; direction:rtl;";
    container.innerHTML = `
        <div style="font-weight:bold; border-bottom:1px solid rgba(255,255,255,0.2); padding-bottom:5px; margin-bottom:5px; color:${node.color}">
            ${node.originalLabel}
        </div>
        <div style="font-size:0.9em; line-height:1.6;">
            🎂 تولد: ${node.birth}<br>
            ${node.spouseName ? `💍 همسر: ${node.spouseName}<br>` : ''}
            📍 سطح: ${node.level === 0 ? 'نسل اول' : node.level === 1 ? 'فرزند' : 'نوه'}
        </div>`;
    return container;
}

const nodes = new vis.DataSet([]);
const edges = new vis.DataSet([]);

// --- 4. گراف ---
function initNetwork() {
    const container = document.getElementById('mynetwork');
    const data = { nodes: nodes, edges: edges };
    const options = {
        nodes: { borderWidth: 2, shadow: true },
        edges: { smooth: { type: 'cubicBezier', forceDirection: 'vertical', roundness: 0.5 } },
        layout: { 
            hierarchical: { 
                direction: currentLayout, sortMethod: 'directed', 
                nodeSpacing: 100, levelSeparation: 200, blockShifting: true, edgeMinimization: true
            } 
        },
        physics: false,
        interaction: { hover: true, dragNodes: true, tooltipDelay: 50, zoomView: true }
    };

    document.fonts.ready.then(function () {
        network = new vis.Network(container, data, options);
        network.on("afterDrawing", function() {
             const loader = document.getElementById('loading-screen');
             if(loader) { loader.style.opacity = '0'; setTimeout(() => loader.style.display = 'none', 500); }
        });
        network.on("click", function (params) { if (params.nodes.length > 0) handleNodeClick(params.nodes[0]); });
        network.on("doubleClick", function(params) { if (params.nodes.length > 0) toggleBranch(params.nodes[0]); });
        updateView();
    });
}

// --- 5. محاسبه‌گر نسبت (BFS) ---
function calculatePath() {
    const startId = parseInt(document.getElementById('path-from').value);
    const endId = parseInt(document.getElementById('path-to').value);
    const resultDiv = document.getElementById('path-result');

    if (!startId || !endId) { resultDiv.innerHTML = "لطفاً دو نفر را انتخاب کنید."; return; }
    if (startId === endId) { resultDiv.innerHTML = "هر دو نفر یکی هستند!"; return; }

    const queue = [startId];
    const visited = { [startId]: true };
    const parentMap = {};
    let found = false;

    while (queue.length > 0) {
        const current = queue.shift();
        if (current === endId) { found = true; break; }
        const data = relationshipMap[current];
        const neighbors = [...data.parents, ...data.children, ...data.spouses, ...data.siblings];
        
        for (let nId of neighbors) {
            if (!visited[nId]) {
                visited[nId] = true;
                parentMap[nId] = current;
                queue.push(nId);
            }
        }
    }

    if (found) {
        const path = [];
        let curr = endId;
        while (curr !== startId) { path.push(curr); curr = parentMap[curr]; }
        path.push(startId);
        path.reverse();
        
        // هایلایت روی گراف
        highlightPath(path);
        
        // نمایش متن
        let html = "";
        for (let i = 0; i < path.length - 1; i++) {
            const u = rawNodes.find(n => n.id === path[i]);
            html += `<div>🔽 ${u.originalLabel}</div>`;
        }
        const last = rawNodes.find(n => n.id === path[path.length-1]);
        html += `<div>🏁 <b>${last.originalLabel}</b></div>`;
        resultDiv.innerHTML = html;
    } else {
        resultDiv.innerHTML = "مسیری یافت نشد.";
    }
}

function highlightPath(pathIds) {
    const allN = nodes.get();
    nodes.update(allN.map(n => ({
        id: n.id,
        color: pathIds.includes(n.id) ? { background: '#27ae60', border: '#1e8449' } : { background: '#eee', border: '#ddd' },
        opacity: pathIds.includes(n.id) ? 1 : 0.2
    })));
    network.fit({ nodes: pathIds, animation: true });
}

// --- 6. توابع کمکی ---
function handleNodeClick(nodeId) {
    const node = rawNodes.find(n => n.id === nodeId);
    document.getElementById('profile-card').style.display = 'block';
    document.getElementById('p-name').innerText = node.originalLabel;
    document.getElementById('p-birth').innerText = node.birth;
    document.getElementById('p-spouse').innerText = node.spouseName || '-';
    
    const img = document.getElementById('p-img');
    img.innerHTML = node.gender === 'male' ? '<i class="fas fa-male"></i>' : '<i class="fas fa-female"></i>';
    img.style.borderColor = node.color; img.style.color = node.color;
    
    const badge = document.getElementById('p-rel-badge');
    if(currentUserId) { badge.innerText = "محاسبه شده"; badge.style.background = node.color; } 
    else { badge.innerText = "-"; badge.style.background = "#ccc"; }
}

function updateIdentity() {
    currentUserId = parseInt(document.getElementById('user-identity').value);
    const all = nodes.get();
    nodes.update(all.map(n => {
        if(n.id === currentUserId) return { id: n.id, borderWidth: 4, size: n.size + 10, color: { border: '#f1c40f' } };
        return { id: n.id, borderWidth: 2, size: rawNodes.find(rn=>rn.id===n.id).size, color: { border: isDarkMode ? '#2d2d2d' : 'white' } };
    }));
}

function toggleBranch(parentId) {
    const children = relationshipMap[parentId].children;
    if (children.length === 0) return;
    const firstChild = children[0];
    const isVisible = nodes.get(firstChild) !== null;

    if (isVisible) {
        const descendants = getAllDescendantsIds(parentId);
        nodes.remove(descendants);
    } else {
        const descendants = getAllDescendantsIds(parentId);
        const currentIds = nodes.getIds();
        const toAdd = rawNodes.filter(n => descendants.includes(n.id) && !currentIds.includes(n.id)).map(n => ({
            id: n.id, label: '', title: generateTooltip(n),
            color: { background: n.color, border: isDarkMode ? '#2d2d2d' : 'white' },
            shape: 'dot', size: n.size, level: n.level,
            font: { face: 'Vazirmatn', size: 14, color: isDarkMode ? '#eee' : '#333', vadjust: n.size + 5 }
        }));
        nodes.add(toAdd);
    }
}
function getAllDescendantsIds(id) {
    let res = [];
    relationshipMap[id].children.forEach(cid => { res.push(cid); res.push(...getAllDescendantsIds(cid)); });
    return res;
}

function updateView() {
    const filterValue = document.getElementById('view-filter').value;
    let allowedIds = [];
    if (filterValue === 'all') allowedIds = rawNodes.map(n => n.id);
    else if (filterValue === 'main_family') allowedIds = rawNodes.filter(n => n.groupKey !== 'relative').map(n => n.id);
    else {
        const branchId = parseInt(filterValue);
        allowedIds = rawNodes.filter(n => n.groupKey === 'main' || n.id === branchId || n.branch === branchId).map(n => n.id);
    }
    const currentIds = nodes.getIds();
    nodes.remove(currentIds.filter(id => !allowedIds.includes(id)));
    const nodesToAdd = rawNodes.filter(n => allowedIds.includes(n.id) && !currentIds.includes(n.id)).map(n => ({
        id: n.id, label: n.level < 2 ? n.originalLabel : '', title: generateTooltip(n),
        color: { background: n.color, border: 'white' }, shape: 'dot', size: n.size, level: n.level,
        font: { face: 'Vazirmatn', size: 14, color: isDarkMode ? '#eee' : '#333', vadjust: n.size + 5 }
    }));
    nodes.add(nodesToAdd);
    const edgesToAdd = rawEdges.filter(e => allowedIds.includes(e.from) && allowedIds.includes(e.to)).map(e => ({
        from: e.from, to: e.to, dashes: e.type === 'spouse' || e.type === 'sibling_link',
        color: e.type === 'spouse' ? '#555' : '#bdc3c7', width: e.type === 'spouse' ? 2 : 1
    }));
    edges.clear(); edges.add(edgesToAdd);
    if(network) network.fit();
}

function initTimeline() {
    const container = document.getElementById('mytimeline');
    const items = new vis.DataSet(rawNodes.map(n => ({
        id: n.id, content: n.originalLabel, start: new Date(n.birth + 621, 0, 1),
        style: `background-color: ${n.color}; border-color: ${n.color}; color: white; border-radius: 4px; font-family: Vazirmatn; font-size: 12px;`
    })));
    const options = { locale: 'en', height: '100%', start: new Date(1920, 0, 1), end: new Date(2025, 0, 1), format: { minorLabels: d => (new Date(d).getFullYear() - 621).toString(), majorLabels: () => "" } };
    timeline = new vis.Timeline(container, items, options);
}

function toggleViewMode() {
    const net = document.getElementById('mynetwork'), time = document.getElementById('timeline-wrapper');
    if (net.style.display === 'none') { net.style.display = 'block'; time.style.display = 'none'; }
    else { net.style.display = 'none'; time.style.display = 'block'; if (!timeline) initTimeline(); }
}
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('closed'); setTimeout(() => network && network.fit(), 400); }
function toggleDarkMode() { isDarkMode = !isDarkMode; document.body.classList.toggle('dark-mode'); updateView(); }
function changeLayout() { currentLayout = document.getElementById('layout-direction').value; network.setOptions({ layout: { hierarchical: { direction: currentLayout } } }); network.fit();}
function exportGraph() { const canvas = document.querySelector('#mynetwork canvas'); const link = document.createElement('a'); link.download = 'Tree.png'; link.href = canvas.toDataURL(); link.click(); }
function searchNode() { const q = document.getElementById('search').value; const t = rawNodes.find(n => n.originalLabel.includes(q)); if(t && nodes.get(t.id)) { network.selectNodes([t.id]); network.focus(t.id, {scale: 1.2, animation: true}); } }

initNetwork();