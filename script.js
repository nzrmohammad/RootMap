// --- تنظیمات و متغیرهای سراسری ---
const branchColors = ['#E57373', '#F06292', '#BA68C8', '#9575CD', '#4FC3F7', '#4DB6AC', '#81C784', '#FFD54F'];
let rawNodes = [], rawEdges = [], idCounter = 1;
let expandedNodes = new Set(); // ست برای نگهداری وضعیت باز/بسته بودن نودها
let network = null;
let currentUserId = null;
let highlightedNodeId = null;
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
// جایگزین تابع generateTooltipHTML در فایل script.js
function generateTooltipHTML(node) {
    if (node.isSpouse) return '';
    
    const childCount = relationshipMap[node.id] ? relationshipMap[node.id].children.length : 0;
    const imageSrc = getAvatar(node.gender);
    const spouseId = relationshipMap[node.id].spouses[0];
    const spouseName = spouseId ? rawNodes.find(n => n.id === spouseId).originalLabel : '-';
    const genderColor = node.gender === 'male' ? '#2563eb' : '#e11d48';

    // --- محاسبه سن و تاریخ ---
    let ageInfo = "";
    let birthInfo = node.birth ? `متولد: ${node.birth}` : "";
    let deathInfo = node.death ? ` | وفات: ${node.death}` : "";
    
    if (node.birth) {
        if (node.death) {
            // اگر فوت شده: محاسبه طول عمر
            const age = node.death - node.birth;
            ageInfo = `<div class="t-row"><i class="fas fa-hourglass-end"></i> <span>سن در زمان وفات: ${age} سال</span></div>`;
        } else {
            // اگر زنده است: محاسبه سن تا امسال (فرض ۱۴۰۳)
            const currentYear = 1403; // یا new Date().toLocaleDateString(...) برای دقت بیشتر
            const age = currentYear - node.birth;
            ageInfo = `<div class="t-row"><i class="fas fa-hourglass-half"></i> <span>سن: ${age} سال</span></div>`;
        }
    }
    // -------------------------

    return `
        <div class="tooltip-header" style="background:${genderColor}">
            <img src="${imageSrc}" class="tooltip-img">
            <div class="tooltip-title">
                ${node.originalLabel}
                <div style="font-size:0.6em; opacity:0.9; margin-top:2px">${birthInfo}${deathInfo}</div>
            </div>
        </div>
        <div class="tooltip-body">
            <div class="t-row"><i class="fas fa-venus-mars"></i> <span>${node.gender === 'male' ? 'مرد' : 'زن'}</span></div>
            ${ageInfo}
            <div class="t-row"><i class="fas fa-ring"></i> <span>همسر: ${spouseName}</span></div>
            <div class="t-row"><i class="fas fa-child"></i> <span>تعداد فرزند: ${childCount}</span></div>
            <div class="t-badge" style="background:${node.color}20; color:${node.color}">
                ${node.level === 0 ? 'ریشه خاندان' : node.level === 1 ? 'فرزند ارشد' : 'نوه'}
            </div>
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
                // خط background کامل حذف شد
                strokeWidth: 5,           // ✅ اضافه کردن حاشیه دور متن (به جای کادر)
                strokeColor: '#ffffff',   // ✅ رنگ حاشیه سفید (برای تم روشن)
                vadjust: 0,
                bold: { size: 20, color: '#000000', mod: 'bold' }
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
                sortMethod: 'directed',
                nodeSpacing: 180,
                levelSeparation: 150,
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
        network.on("afterDrawing", function (ctx) {
             // 1. مخفی کردن لودر
             const loader = document.getElementById('loading-screen');
             if(loader && loader.style.display !== 'none') { 
                 loader.style.opacity = '0'; 
                 setTimeout(() => loader.style.display = 'none', 500); 
             }

             // گرفتن موقعیت تمام گره‌ها
             const allPositions = network.getPositions();

             // 2. رسم شمع 🕯️ برای تمام فوت‌شدگان
             rawNodes.forEach(node => {
                 // اگر گره الان در صفحه وجود دارد AND فوت شده است
                 if (allPositions[node.id] && node.death) {
                     
                     // اگر این گره الان در حال جستجو (هایلایت) است، شمع نکش (تا عینک بیاید)
                     if (highlightedNodeId === node.id) return;

                     const pos = allPositions[node.id];
                     
                     // --- تنظیم فاصله شمع (خیلی نزدیک‌تر شد) ---
                     const offset = node.level === 0 ? 42 : (node.level === 1 ? 32 : 22);

                     ctx.font = "bold 20px Arial"; // سایز شمع
                     ctx.textAlign = "center";
                     ctx.textBaseline = "bottom";
                     
                    // تغییر برای شمع: سایه دورش را طلایی/نارنجی می‌کنیم تا در سفید هم دیده شود
                     ctx.strokeStyle = '#f59e0b'; // رنگ نارنجی دور شمع
                     ctx.lineWidth = 1; // خط نازک‌تر
                     ctx.strokeText("🕯️", pos.x, pos.y - offset);
                     
                     // خود شمع
                     ctx.fillStyle = "black";
                     ctx.fillText("🕯️", pos.x, pos.y - offset);
                 }
             });

             // 3. رسم عینک 😎 (برای جستجو)
            if (highlightedNodeId !== null) {
                const pos = network.getPositions([highlightedNodeId])[highlightedNodeId];
                if (pos) {
                    const node = rawNodes.find(n => n.id === highlightedNodeId);
                    // تنظیم فاصله عینک (همان تنظیمات قبلی که اوکی بود)
                    const offset = node.level === 0 ? 55 : (node.level === 1 ? 45 : 32);

                    ctx.font = "bold 25px Arial";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "bottom";
                    ctx.strokeStyle = 'white';
                    ctx.lineWidth = 3; 
                    ctx.strokeText("😎", pos.x, pos.y - offset);
                    ctx.fillStyle = "black"; 
                    ctx.fillText("😎", pos.x, pos.y - offset);
                }
            }
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
        
        // --- اصلاحیه ۲: هندل کردن کامل کلیک ---
        network.on("click", function(params) {
            // اگر روی گره کلیک شد: نمایش اطلاعات
            if (params.nodes.length > 0) {
                handleNodeClick(params.nodes[0]);
            } 
            // اگر روی جای خالی کلیک شد: حذف ایموجی
            else {
                highlightedNodeId = null;
                network.redraw();
            }
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

function updateView() {
    if(network) network.unselectAll();

    // تشخیص تم تاریک
    const isDarkMode = document.body.classList.contains('dark-mode');

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
        // --- تنظیم رنگ هوشمند متن ---
        let textColor, textStroke, strokeWidth;
        
        if (isDarkMode) {
            // تم تاریک: متن سفید با حاشیه مشکی
            textColor = n.death ? '#94a3b8' : '#ffffff'; 
            textStroke = 'rgba(0, 0, 0, 0.8)'; // به جای رنگ سالید، از سیاه شفاف استفاده کنید
            strokeWidth = 3; // ضخامت را کمی کمتر کنید تا ظریف‌تر شود
        } else {
            // تم روشن: متن مشکی با حاشیه سفید
            textColor = n.death ? '#4b5563' : '#0f172a'; 
            textStroke = '#ffffff';
            strokeWidth = 4;
        }

        let nodeObj = {
            id: n.id,
            level: n.level,
            font: { 
            face: 'Vazirmatn', // مطمئن شوید فونت وزیر لود شده باشد
            size: 22, // سایز را کمی بزرگتر کنید
            color: textColor,        
            strokeWidth: strokeWidth,          
            strokeColor: textStroke, 
            vadjust: -5, // کمی متن را بالاتر ببرید تا روی عکس نیفتد
            bold: { size: 22, mod: 'bold' } 
            },
            shape: 'circularImage',
            label: n.originalLabel
        };

        // تنظیمات رنگ گره‌ها
        let borderColor = n.gender === 'male' ? '#2563eb' : '#e11d48';
        let bgColor = '#fff';

        if (n.death) {
            borderColor = '#4b5563'; 
            bgColor = '#f3f4f6';     
        }

        if (n.isSpouse) {
            nodeObj.label = n.label === "نامشخص" ? "" : n.label;
            nodeObj.color = { border: '#9ca3af', background: '#fff' };
            nodeObj.image = getAvatar(n.gender);
        } else {
            nodeObj.color = { border: borderColor, background: bgColor };
            nodeObj.image = getAvatar(n.gender);

            const hasChildren = relationshipMap[n.id].children.length > 0;
            if (hasChildren && !expandedNodes.has(n.id) && filterValue === 'all') {
                nodeObj.label += " (+)";
            }
        }
        
        nodeObj.borderWidth = n.death ? 6 : 4; 
        
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
            color: isGhost ? 'rgba(0,0,0,0)' : (isSpouse ? '#ef4444' : '#b0b0b0'), 
            dashes: isSpouse ? [5, 5] : false, 
            width: isSpouse ? 1.5 : 2,
            hoverWidth: 0, 
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

// --- تابع هوشمند محاسبه نسبت با ریشه ---
function getRelationshipText(node) {
    // ۱. پیدا کردن ریشه (کسی که level 0 است)
    const rootNode = rawNodes.find(n => n.level === 0);
    const rootName = rootNode ? rootNode.originalLabel : "بزرگ خاندان";

    // ۲. اگر خود ریشه انتخاب شده
    if (node.level === 0) return "بزرگ خاندان (ریشه)";

    // ۳. اگر همسر انتخاب شده
    if (node.isSpouse) {
        // پیدا کردن نام همسرش
        const spouseId = relationshipMap[node.id].spouses[0];
        const spouse = spouseId ? rawNodes.find(n => n.id === spouseId) : null;
        if (spouse) {
            // بازگشتی: نسبت همسرش را حساب می‌کنیم و "همسرِ" را به اولش اضافه می‌کنیم
            // مثلاً: همسرِ نوه نظر
            const spouseRel = getRelationshipText(spouse);
            return `همسرِ ${spouseRel.replace(` ${rootName}`, '')}ِ ${rootName}`; 
        }
        return "عروس/داماد خاندان";
    }

    // ۴. محاسبه بر اساس سطح (Level)
    let term = "";
    switch (node.level) {
        case 1: term = "فرزند"; break;
        case 2: term = "نوه"; break;
        case 3: term = "نتیجه"; break;
        case 4: term = "نبیره"; break;
        case 5: term = "ندیده"; break;
        default: term = `نسل ${node.level}ام`; break;
    }

    // ۵. منطق پیشرفته برای نوه (تشخیص پسری/دختری)
    if (node.level === 2) {
        const parentId = relationshipMap[node.id].parents[0];
        if (parentId) {
            const parent = rawNodes.find(n => n.id === parentId);
            if (parent) {
                const side = parent.gender === 'male' ? "پسری" : "دختری";
                return `${term} ${side} ${rootName}`; // خروجی: نوه پسری نظر
            }
        }
    }

    // خروجی استاندارد: نتیجه نظر
    return `${term} ${rootName}`;
}

// جایگزین تابع handleNodeClick در فایل script.js
function handleNodeClick(nodeId) {
    const node = rawNodes.find(n => n.id === nodeId);
    if (!node) return;

    const profileCard = document.getElementById('profile-card');
    profileCard.style.display = 'block';
    
    // پر کردن اطلاعات (نام، تولد، همسر، عکس)
    document.getElementById('p-name').innerText = node.originalLabel;
    document.getElementById('p-birth').innerText = node.birth ? node.birth : "-";
    const spouseId = relationshipMap[node.id].spouses[0];
    document.getElementById('p-spouse').innerText = spouseId ? rawNodes.find(n => n.id === spouseId).originalLabel : 'مجرد';
    
    const img = document.getElementById('p-img');
    const borderColor = node.gender === 'male' ? '#2563eb' : '#e11d48';
    const imgSrc = node.image ? node.image : getAvatar(node.gender);
    img.innerHTML = `<img src="${imgSrc}" style="width:100%; height:100%; object-fit:cover; border-radius:50%">`;
    img.style.border = `4px solid ${borderColor}`;

    // --- محاسبه نسبت فامیلی ---
    const badge = document.getElementById('p-rel-badge');
    let relationshipText = "";
    
    if (currentUserId) {
        relationshipText = getKinship(currentUserId, nodeId);
        if (nodeId === currentUserId) relationshipText = "خودِ شما";
    } else {
        relationshipText = getRelationshipText(node);
    }
    
    badge.innerText = relationshipText;
    badge.style.background = node.isSpouse ? '#64748b' : (node.gender === 'male' ? '#2563eb' : '#e11d48');
    if (nodeId === currentUserId) badge.style.background = '#f59e0b'; // رنگ طلایی برای خود کاربر

    // --- 🔥 ویژگی جدید: دکمه "این منم" ---
    // بررسی می‌کنیم آیا دکمه قبلاً ساخته شده یا نه
    let setMeBtn = document.getElementById('btn-set-identity');
    
    // اگر دکمه وجود نداشت، آن را می‌سازیم و به کارت اضافه می‌کنیم
    if (!setMeBtn) {
        setMeBtn = document.createElement('button');
        setMeBtn.id = 'btn-set-identity';
        setMeBtn.className = 'btn-action'; // از استایل دکمه‌های موجود استفاده می‌کنیم
        setMeBtn.style.marginTop = '10px';
        setMeBtn.style.borderStyle = 'solid'; // کمی متمایز باشد
        
        // اضافه کردن دکمه بعد از دکمه "افزودن فرزند" یا به انتهای کارت
        const grid = profileCard.querySelector('.data-grid');
        grid.parentNode.insertBefore(setMeBtn, grid.nextSibling); 
    }

    // تنظیم ظاهر و عملکرد دکمه
    if (currentUserId === nodeId) {
        // اگر این پروفایل الان انتخاب شده است
        setMeBtn.innerHTML = '<i class="fas fa-check-circle"></i> شما هستید';
        setMeBtn.style.background = '#10b981'; // سبز
        setMeBtn.style.color = 'white';
        setMeBtn.style.borderColor = '#10b981';
        setMeBtn.disabled = true; // غیرفعال کردن کلیک
    } else {
        // اگر پروفایل کس دیگری است
        setMeBtn.innerHTML = '<i class="fas fa-user-check"></i> این من هستم';
        setMeBtn.style.background = 'transparent';
        setMeBtn.style.color = 'var(--accent-color)';
        setMeBtn.style.borderColor = 'var(--accent-color)';
        setMeBtn.disabled = false;
        
        setMeBtn.onclick = function() {
            // تنظیم هویت
            currentUserId = nodeId;
            
            // آپدیت کردن دراپ‌دان (برای هماهنگی)
            const dropdown = document.getElementById('user-identity');
            if(dropdown) dropdown.value = nodeId;

            // پیام تایید موقت (اختیاری)
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> در حال تنظیم...';
            
            setTimeout(() => {
                // رفرش کردن گرافیک و پنل
                updateIdentity(); // این تابع قبلاً نوشته شده و گراف را رفرش می‌کند
                handleNodeClick(nodeId); // پنل را دوباره لود می‌کنیم تا دکمه سبز شود
            }, 500);
        };
    }

    // باز کردن سایدبار
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
    
    // اضافه شده: اگر همین الان کسی انتخاب شده، دوباره اطلاعاتش را آپدیت کن تا نسبت جدید نشان داده شود
    const selectedNodes = network.getSelectedNodes();
    if (selectedNodes.length > 0) {
        handleNodeClick(selectedNodes[0]);
    }

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
// --- جایگزین تابع searchNode در فایل script.js ---

function searchNode() {
    const query = document.getElementById('search').value.trim();
    const suggestionsBox = document.getElementById('search-suggestions');
    
    // اگر ورودی خالی بود، لیست را مخفی کن
    if (query.length === 0) {
        suggestionsBox.style.display = 'none';
        return;
    }

    // فیلتر کردن افراد (بر اساس نام)
    const matches = rawNodes.filter(n => 
        !n.isSpouse && // همسرها را جدا جستجو نکنیم (اختیاری)
        n.originalLabel.includes(query)
    );

    if (matches.length > 0) {
        let html = '';
        matches.forEach(node => {
            // هایلایت کردن بخش پیدا شده در متن
            const regex = new RegExp(`(${query})`, 'gi');
            const highlightedName = node.originalLabel.replace(regex, '<span class="suggestion-match">$1</span>');
            
            // اطلاعات اضافی مثل نام پدر یا همسر برای تشخیص تشابه اسمی
            const spouseId = relationshipMap[node.id].spouses[0];
            const spouseName = spouseId ? rawNodes.find(n => n.id === spouseId).originalLabel : '';
            const extraInfo = spouseName ? `(همسر: ${spouseName})` : '';

            html += `
                <div class="suggestion-item" onclick="selectResult(${node.id})">
                    <span>${highlightedName} <span class="s-info">${extraInfo}</span></span>
                    <i class="fas fa-chevron-left" style="font-size:0.7em; opacity:0.5"></i>
                </div>
            `;
        });
        suggestionsBox.innerHTML = html;
        suggestionsBox.style.display = 'block';
    } else {
        suggestionsBox.innerHTML = '<div class="suggestion-item" style="cursor:default; opacity:0.7">موردی یافت نشد</div>';
        suggestionsBox.style.display = 'block';
    }
}

// --- نسخه پیشرفته تابع انتخاب نتیجه جستجو ---

function selectResult(nodeId) {
    // 1. بستن لیست و پاک کردن ورودی
    document.getElementById('search-suggestions').style.display = 'none';
    document.getElementById('search').value = '';

    // 2. باز کردن مسیر والدین
    expandPathToNode(nodeId);
    updateView();

    // 3. تنظیم متغیر برای رسم ایموجی (تغییر اصلی اینجاست)
    highlightedNodeId = nodeId;
    network.redraw(); // دستور رسم مجدد برای نمایش ایموجی

    // 4. زوم روی سوژه
    setTimeout(() => {
        network.selectNodes([nodeId]);
        network.focus(nodeId, {
            scale: 1.3,
            animation: {
                duration: 1500,
                easingFunction: 'easeInOutQuart'
            }
        });
    }, 100);

    // 5. نمایش اطلاعات
    handleNodeClick(nodeId);
}

// --- تابع کمکی: باز کردن بازگشتی والدین ---
function expandPathToNode(targetId) {
    const parentIds = relationshipMap[targetId].parents;
    
    if (parentIds && parentIds.length > 0) {
        parentIds.forEach(parentId => {
            // اگر این پدر قبلاً باز نشده، بازش کن (به لیست بازشده‌ها اضافه کن)
            if (!expandedNodes.has(parentId)) {
                expandedNodes.add(parentId);
            }
            // حالا برو سراغ پدرِ این پدر (بازگشتی تا ریشه)
            expandPathToNode(parentId);
        });
    }
}

// بستن لیست جستجو وقتی جای دیگری کلیک شد
document.addEventListener('click', function(e) {
    const container = document.querySelector('.search-wrapper');
    if (!container.contains(e.target)) {
        document.getElementById('search-suggestions').style.display = 'none';
    }
});
// --- 5. تنظیمات و توابع تایم‌لاین ---

let timeline = null;

// --- نسخه جدید و زیبای تایم‌لاین ---
function initTimeline() {
    const container = document.getElementById('mytimeline');
    // پاک کردن محتوای قبلی اگر وجود دارد
    container.innerHTML = '';
    
    const items = new vis.DataSet();
    
    // مرتب‌سازی نودها برای اینکه بدانیم کدام سطح هستند (اختیاری)
    rawNodes.forEach(node => {
        if (node.birth) {
            const borderColor = node.gender === 'male' ? '#2563eb' : '#e11d48';
            const imgSrc = node.image ? node.image : getAvatar(node.gender);

            // نکته مهم: استایل inline هم میدهیم تا اگر CSS لود نشد، عکس منفجر نشود!
            const contentHTML = `
                <div class="t-item">
                    <img src="${imgSrc}" class="t-avatar" style="width:30px; height:30px; border-color: ${borderColor}">
                    <span class="t-name">${node.originalLabel}</span>
                    <div class="t-stem" style="background:${borderColor}"></div> 
                </div>
            `;

            items.add({
                id: node.id,
                start: String(node.birth),
                content: contentHTML,
                type: 'point', 
                // حذف استایل‌های اضافه که ممکن است خرابکاری کنند
                className: 'custom-vis-item' 
            });
        }
    });

    // تنظیمات محور زمان
    const options = {
        height: '220px',      // ارتفاع مناسب برای عکس‌ها
        min: '1200',          // شروع محور (طبق درخواست شما)
        max: '1410',          // پایان محور (آینده نزدیک)
        start: '1280',        // جایی که دوربین در ابتدا نشان می‌دهد
        end: '1400',
        rtl: true,            // راست به چپ
        orientation: 'bottom',// محور اعداد پایین باشد
        zoomMin: 1000 * 60 * 60 * 24 * 31 * 12 * 5, // حداقل زوم (۵ سال)
        zoomMax: 1000 * 60 * 60 * 24 * 31 * 12 * 500, // حداکثر زوم (۵۰۰ سال)
        showCurrentTime: true, // خط زمان حال
        moveable: true,
        zoomable: true,
        verticalScroll: true,  // اگر عکس‌ها زیاد شدند روی هم نیفتند، اسکرول بخورد
        stack: true,           // اجازه بدهیم عکس‌ها روی هم چیده شوند (پله‌ای) تا دیده شوند
        stackSubgroups: true
    };

    if (items.length > 0) {
        timeline = new vis.Timeline(container, items, options);
        
        // کلیک روی عکس در تایم‌لاین -> زوم روی گراف
        timeline.on('select', function (properties) {
            if(properties.items.length > 0) {
                const selectedId = properties.items[0];
                
                // باز کردن گراف
                network.selectNodes([selectedId]);
                network.focus(selectedId, { scale: 1.2, animation: true });
                handleNodeClick(selectedId);
            }
        });
    } else {
        container.innerHTML = '<div style="text-align:center; padding:40px; color:#666;">تاریخ تولدی برای نمایش در تایم‌لاین ثبت نشده است.</div>';
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

// --- تابع پیشرفته محاسبه نسبت بین دو نفر (من و سوژه) ---
function getKinship(meId, targetId) {
    if (meId === targetId) return "خودِ شما";
    
    // ۱. بررسی همسری مستقیم
    if (relationshipMap[meId].spouses.includes(targetId)) return "همسر شما";

    // ۲. یافتن مسیر خونی (Parents traversal)
    // تابع کمکی برای پیدا کردن اجداد و فاصله آن‌ها
    function getAncestors(id) {
        let ancestors = { [id]: 0 }; // id: distance
        let queue = [{ id: id, dist: 0 }];
        while (queue.length > 0) {
            let curr = queue.shift();
            let parents = relationshipMap[curr.id].parents;
            parents.forEach(pid => {
                if (ancestors[pid] === undefined) {
                    ancestors[pid] = curr.dist + 1;
                    queue.push({ id: pid, dist: curr.dist + 1 });
                }
            });
        }
        return ancestors;
    }

    const myAncestors = getAncestors(meId);
    const targetAncestors = getAncestors(targetId);

    // ۳. پیدا کردن نزدیک‌ترین جد مشترک (LCA)
    let lcaId = null;
    let minSumDist = Infinity;
    
    for (let ancId in myAncestors) {
        if (targetAncestors[ancId] !== undefined) {
            let sumDist = myAncestors[ancId] + targetAncestors[ancId];
            if (sumDist < minSumDist) {
                minSumDist = sumDist;
                lcaId = ancId;
            }
        }
    }

    // اگر جد مشترک پیدا نشد (شاید فقط رابطه سببی/همسری دور باشد یا کلا وصل نباشند)
    if (!lcaId) {
        // اینجا می‌شود منطق پیچیده‌تر برای اقوام همسر نوشت، اما فعلاً:
        return "از بستگان (رابطه سببی)";
    }

    const up = myAncestors[lcaId];      // فاصله من تا جد
    const down = targetAncestors[lcaId]; // فاصله جد تا سوژه
    const targetNode = rawNodes.find(n => n.id === targetId);
    const isMale = targetNode.gender === 'male';

    // ۴. ترجمه فاصله‌ها به نسبت فامیلی
    // (up=0 یعنی خودم یا پایین‌تر، down=0 یعنی اجدادم)
    
    // --- اجداد و فرزندان مستقیم ---
    if (up === 0 && down === 1) return isMale ? "فرزند (پسر)" : "فرزند (دختر)";
    if (up === 0 && down === 2) return "نوه";
    if (up === 0 && down >= 3) return "نتیجه/نبیره";
    
    if (down === 0 && up === 1) return isMale ? "پدر" : "مادر";
    if (down === 0 && up === 2) return isMale ? "پدربزرگ" : "مادربزرگ";
    if (down === 0 && up >= 3) return "جد پدری/مادری";

    // --- خواهر و برادر ---
    if (up === 1 && down === 1) return isMale ? "برادر" : "خواهر";

    // --- عمو، عمه، دایی، خاله ---
    if (up === 1 && down === 2) return isMale ? "برادرزاده" : "خواهرزاده"; // برادر/خواهرِ من، بچه‌اش میشه...
    if (up === 2 && down === 1) {
        // باید بفهمیم از طرف پدر است یا مادر
        // راه ساده: بررسی کنیم جد مشترک پدرِ پدر من است یا پدرِ مادر من
        // اما برای سادگی فعلاً کلی می‌نویسیم (یا می‌توانیم دقیق‌تر کنیم)
        return isMale ? "عمو / دایی" : "عمه / خاله";
    }

    // --- عموزاده، خاله زاده و... ---
    if (up === 2 && down === 2) return isMale ? "پسرعمو/دایی/عمه/خاله" : "دخترعمو/دایی/عمه/خاله";

    return `از بستگان (فاصله ${up} بالا، ${down} پایین)`;
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