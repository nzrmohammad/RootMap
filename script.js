// --- 1. داده‌ها ---
const branchColors = ['#E57373', '#F06292', '#BA68C8', '#9575CD', '#4FC3F7', '#4DB6AC', '#81C784', '#FFD54F'];
const rootFather = { name: "امیرحمزه نظری", gender: "male", birth: 1300, imgUrl: "" };
const rootMother = { name: "ماه‌خاور رستگار", gender: "female", birth: 1305, imgUrl: "" };

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

function getAvatar(node) {
    if (node.imgUrl) return node.imgUrl;
    return node.gender === 'male' 
        ? 'https://cdn-icons-png.flaticon.com/512/4825/4825038.png' 
        : 'https://cdn-icons-png.flaticon.com/512/4825/4825112.png';
}

const fatherId = idCounter++, motherId = idCounter++;
rawNodes.push({ ...rootFather, id: fatherId, label: rootFather.name, level: 0, originalLabel: rootFather.name, color: '#2c3e50', size: 55, groupKey: 'main', spouseName: rootMother.name });
rawNodes.push({ ...rootMother, id: motherId, label: rootMother.name, level: 0, originalLabel: rootMother.name, color: '#2c3e50', size: 55, groupKey: 'main', spouseName: rootFather.name });
rawEdges.push({ from: fatherId, to: motherId, type: "spouse" });

rootRelatives.forEach(rel => {
    const relId = idCounter++, spouseId = idCounter++;
    rawNodes.push({ ...rel, id: relId, label: rel.name, level: 0, originalLabel: rel.name, color: '#95a5a6', size: 40, groupKey: 'relative', spouseName: rel.spouse.name });
    rawNodes.push({ ...rel.spouse, id: spouseId, label: rel.spouse.name, level: 0, originalLabel: rel.spouse.name, color: '#bdc3c7', size: 40, groupKey: 'relative', spouseName: rel.name });
    rawEdges.push({ from: relId, to: spouseId, type: "spouse" });
    if(rel.relatedTo === 'father') rawEdges.push({ from: fatherId, to: relId, type: "sibling_link" });
    else rawEdges.push({ from: motherId, to: relId, type: "sibling_link" });
});

childrenList.forEach((child, index) => {
    const childId = idCounter++;
    const myColor = branchColors[index % branchColors.length];
    rawNodes.push({ ...child, id: childId, label: child.name, level: 1, originalLabel: child.name, color: myColor, size: 40, branch: childId, groupKey: 'child' });
    rawEdges.push({ from: fatherId, to: childId, type: "child" });
    rawEdges.push({ from: motherId, to: childId, type: "child" });
    for (let i = 1; i <= GRANDCHILDREN_PER_CHILD; i++) {
        const gcId = idCounter++;
        const gcName = `فرزند ${i}ِ ${child.name}`;
        const gcGender = Math.random() > 0.5 ? "male" : "female";
        const gcBirth = child.birth + 25 + Math.floor(Math.random() * 10);
        rawNodes.push({ id: gcId, label: gcName, level: 2, gender: gcGender, originalLabel: gcName, birth: gcBirth, color: myColor, size: 28, branch: childId, groupKey: 'grandchild' });
        rawEdges.push({ from: childId, to: gcId, type: "child" });
    }
});

let network = null, timeline = null, isDarkMode = false, currentLayout = "UD", currentUserId = null;
const relationshipMap = {};
rawNodes.forEach(n => relationshipMap[n.id] = { parents: [], children: [], spouses: [], siblings: [] });
rawEdges.forEach(e => {
    if (e.type === 'child') { relationshipMap[e.to].parents.push(e.from); relationshipMap[e.from].children.push(e.to); }
    else if (e.type === 'spouse') { relationshipMap[e.from].spouses.push(e.to); relationshipMap[e.to].spouses.push(e.from); }
    else if (e.type === 'sibling_link') { relationshipMap[e.from].siblings.push(e.to); relationshipMap[e.to].siblings.push(e.from); }
});

const filterSelect = document.getElementById('view-filter');
const identitySelect = document.getElementById('user-identity');
const pathFrom = document.getElementById('path-from');
const pathTo = document.getElementById('path-to');

childrenList.forEach(child => {
    const node = rawNodes.find(n => n.originalLabel === child.name);
    let option = document.createElement("option"); option.value = node.id; option.text = `شاخهِ ${child.name}`; option.style.color = node.color; option.style.fontWeight = 'bold';
    filterSelect.appendChild(option);
});

rawNodes.forEach(n => {
    let opt1 = document.createElement("option"); opt1.value = n.id; opt1.text = n.originalLabel; identitySelect.appendChild(opt1);
    let opt2 = document.createElement("option"); opt2.value = n.id; opt2.text = n.originalLabel; pathFrom.appendChild(opt2);
    let opt3 = document.createElement("option"); opt3.value = n.id; opt3.text = n.originalLabel; pathTo.appendChild(opt3);
});

function generateTooltipHTML(node) {
    const currentYear = 1403;
    const age = currentYear - node.birth;
    const childCount = relationshipMap[node.id] ? relationshipMap[node.id].children.length : 0;
    const imageSrc = getAvatar(node);
    
    return `
        <div class="tooltip-header" style="background:${node.color}">
            <img src="${imageSrc}" class="tooltip-img">
            <div class="tooltip-title">${node.originalLabel}</div>
        </div>
        <div class="tooltip-body">
            <div class="t-row"><i class="fas fa-venus-mars"></i> <span>${node.gender === 'male' ? 'مرد' : 'زن'}</span></div>
            <div class="t-row"><i class="fas fa-birthday-cake"></i> <span>${node.birth} (سن: ${age})</span></div>
            ${node.spouseName ? `<div class="t-row"><i class="fas fa-ring"></i> <span>همسر: ${node.spouseName}</span></div>` : ''}
            <div class="t-row"><i class="fas fa-child"></i> <span>تعداد فرزند: ${childCount}</span></div>
            <div class="t-badge" style="background:${node.color}20; color:${node.color}">
                ${node.level === 0 ? 'نسل اول' : node.level === 1 ? 'نسل دوم' : 'نسل سوم'}
            </div>
        </div>`;
}

const nodes = new vis.DataSet([]);
const edges = new vis.DataSet([]);

function initNetwork() {
    const container = document.getElementById('mynetwork');
    const data = { nodes: nodes, edges: edges };
    
    const options = {
        nodes: {
            shape: 'circularImage',
            brokenImage: 'https://cdn-icons-png.flaticon.com/512/1144/1144760.png',
            borderWidth: 4, 
            color: { border: '#fff', background: '#fff', highlight: { border: '#2563eb', background: '#fff' } },
            font: { 
                face: 'Vazirmatn', size: 16, color: '#000000', background: 'rgba(255, 255, 255, 0.85)',
                strokeWidth: 0, vadjust: 0
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
                nodeSpacing: 160, levelSeparation: 200, 
                blockShifting: true, edgeMinimization: true
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
            if(node) {
                tooltipEl.innerHTML = generateTooltipHTML(node);
                tooltipEl.style.display = 'block';
                const nodePosition = network.getPositions([nodeId])[nodeId];
                const domPosition = network.canvasToDOM(nodePosition);
                tooltipEl.style.left = domPosition.x + 'px';
                tooltipEl.style.top = (domPosition.y - 40) + 'px';
            }
        });

        network.on("blurNode", function () { tooltipEl.style.display = 'none'; });
        network.on("dragStart", () => tooltipEl.style.display = 'none');
        network.on("zoom", () => tooltipEl.style.display = 'none');
        network.on("click", function (params) { if (params.nodes.length > 0) handleNodeClick(params.nodes[0]); });
        network.on("doubleClick", function(params) { if (params.nodes.length > 0) toggleBranch(params.nodes[0]); });
        updateView();
    });
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
    const allN = nodes.get();
    nodes.update(allN.map(n => ({
        id: n.id,
        opacity: pathIds.includes(n.id) ? 1 : 0.3,
        size: pathIds.includes(n.id) ? 60 : rawNodes.find(rn=>rn.id===n.id).size
    })));
    network.fit({ nodes: pathIds, animation: true });
}

function handleNodeClick(nodeId) {
    const node = rawNodes.find(n => n.id === nodeId);
    document.getElementById('profile-card').style.display = 'block';
    document.getElementById('p-name').innerText = node.originalLabel;
    document.getElementById('p-birth').innerText = node.birth;
    document.getElementById('p-spouse').innerText = node.spouseName || '-';
    const img = document.getElementById('p-img');
    img.innerHTML = `<img src="${getAvatar(node)}" style="width:100%; height:100%; object-fit:cover; border-radius:50%">`;
    img.style.border = `3px solid ${node.color}`;
    const badge = document.getElementById('p-rel-badge');
    badge.innerText = "جزئیات"; badge.style.background = node.color;
    
    // باز کردن سایدبار راست برای نمایش جزئیات
    const sb = document.getElementById('sidebar');
    if(sb.classList.contains('closed')) sb.classList.remove('closed');
}

function updateIdentity() { 
    currentUserId = parseInt(document.getElementById('user-identity').value);
    const all = nodes.get();
    nodes.update(all.map(n => {
        if(n.id === currentUserId) return { id: n.id, borderWidth: 6, color: { border: '#f1c40f' } };
        return { id: n.id, borderWidth: 4, color: { border: '#fff' } };
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
            id: n.id, label: '', image: getAvatar(n),
            color: { border: n.color }, shape: 'circularImage', size: n.size, level: n.level
        }));
        nodes.add(toAdd);
    }
}
function getAllDescendantsIds(id) { let res = []; relationshipMap[id].children.forEach(cid => { res.push(cid); res.push(...getAllDescendantsIds(cid)); }); return res; }

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
        id: n.id, 
        label: n.level < 2 ? n.originalLabel : '', 
        image: getAvatar(n), 
        color: { border: n.color }, 
        size: n.size, 
        level: n.level,
        font: { background: 'rgba(255,255,255,0.85)', vadjust: 0, size: 16 }
    }));
    nodes.add(nodesToAdd);
    
    const edgesToAdd = rawEdges.filter(e => allowedIds.includes(e.from) && allowedIds.includes(e.to)).map(e => ({
        from: e.from, to: e.to, dashes: e.type === 'spouse' || e.type === 'sibling_link',
        color: e.type === 'spouse' ? '#7f8c8d' : '#bdc3c7', width: e.type === 'spouse' ? 2 : 2
    }));
    edges.clear(); edges.add(edgesToAdd);
    if(network) network.fit();
}

function initTimeline() {
    const container = document.getElementById('mytimeline');
    const items = new vis.DataSet(rawNodes.map(n => ({
        id: n.id, content: n.originalLabel, start: new Date(n.birth + 621, 0, 1),
        style: `background-color: ${n.color}; border-color: ${n.color}; color: white; border-radius: 4px; font-family: Vazirmatn; font-size: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);`
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
function toggleLeftPanel() { document.getElementById('left-panel').classList.toggle('closed'); setTimeout(() => network && network.fit(), 400); }
function toggleDarkMode() { isDarkMode = !isDarkMode; document.body.classList.toggle('dark-mode'); updateView(); }
function changeLayout() { currentLayout = document.getElementById('layout-direction').value; network.setOptions({ layout: { hierarchical: { direction: currentLayout } } }); network.fit();}
function exportGraph() { const canvas = document.querySelector('#mynetwork canvas'); const link = document.createElement('a'); link.download = 'Tree.png'; link.href = canvas.toDataURL(); link.click(); }
function searchNode() { const q = document.getElementById('search').value; const t = rawNodes.find(n => n.originalLabel.includes(q)); if(t && nodes.get(t.id)) { network.selectNodes([t.id]); network.focus(t.id, {scale: 1.2, animation: true}); } }

initNetwork();