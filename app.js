// WESTON SC - SWIMMERS & PARENTS HUB APP ENGINE
let RAW_SWIMMERS_DATA = [];
let SQUAD_LIST_DATA = [];
let CALENDAR_DATA = [];
let COUNTY_SUMMARY = [];
let BSG_SUMMARY = [];
let DEVLOP_DATA = [];

// 1. VIEW SWITCHER
function switchView(viewId) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const activeTab = document.getElementById('tab-' + viewId);
    if (activeTab) activeTab.classList.add('active');

    document.querySelectorAll('.view-content').forEach(el => el.classList.remove('active'));
    const targetView = document.getElementById('view-' + viewId);
    if (targetView) targetView.classList.add('active');

    const titles = {
        'overview': ['Swimmers & Parents Hub', 'Track personal bests, Swim England event progression, squad allocations, and target meets.'],
        'swimmers': ['Swimmer PBs & Progression', 'Detailed performance history, personal bests, rolling 12-month form, and Swim England graphs.'],
        'movements': ['Squad Movements & Training Schedules', 'Review current squad allocations, weekly pool training schedules, and weekend extra sessions.'],
        'calendar': ['Meet Calendar', 'Scheduled galas, target open meets, entry deadlines, and pool venues.']
    };

    if (titles[viewId] && document.getElementById('view-title')) {
        const titleElem = document.getElementById('view-title');
        const descElem = document.getElementById('view-desc');
        if (titleElem) titleElem.innerText = titles[viewId][0];
        if (descElem) descElem.innerText = titles[viewId][1];
    }
}

// 2. HELPER UTILITIES
function getRowVal(row, possibleKeys) {
    if (!row || typeof row !== 'object') return '';
    const rowKeys = Object.keys(row);
    for (const key of rowKeys) {
        const cleanKey = key.trim().toLowerCase();
        for (const target of possibleKeys) {
            if (cleanKey === target.trim().toLowerCase()) {
                const val = row[key];
                return val !== null && val !== undefined ? String(val).trim() : '';
            }
        }
    }
    return '';
}

function formatDateDDMMYYYY(dateStr) {
    if (!dateStr) return '-';
    const cleanStr = String(dateStr).trim().split('T')[0].split(' ')[0];
    const parts = cleanStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
        const [year, month, day] = parts;
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
    return cleanStr || '-';
}

function parseRecordDate(dateStr) {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;
    const s = String(dateStr).trim().split('T')[0].split(' ')[0];

    const ddmmyyyy = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (ddmmyyyy) {
        return new Date(parseInt(ddmmyyyy[3], 10), parseInt(ddmmyyyy[2], 10) - 1, parseInt(ddmmyyyy[1], 10));
    }
    const yyyymmdd = s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
    if (yyyymmdd) {
        return new Date(parseInt(yyyymmdd[1], 10), parseInt(yyyymmdd[2], 10) - 1, parseInt(yyyymmdd[3], 10));
    }
    const parsed = new Date(s);
    return isNaN(parsed.getTime()) ? null : parsed;
}

function getDataset(rawData, possibleNames) {
    if (!rawData || typeof rawData !== 'object') return [];
    for (const key of Object.keys(rawData)) {
        const cleanKey = key.trim().toLowerCase();
        for (const name of possibleNames) {
            if (cleanKey === name.trim().toLowerCase()) {
                return Array.isArray(rawData[key]) ? rawData[key] : [];
            }
        }
    }
    return [];
}

function getCourse(r) {
    if (!r) return 'SC';
    const c = r.calculatedCourse || r.course || 'SC';
    return (c.toUpperCase() === 'LC' || c.toUpperCase() === 'LONG COURSE') ? 'LC' : 'SC';
}

// 3. SWIM ENGLAND URL ENGINE
const EVENT_STROKE_MAP = {
  "50 Freestyle": 1, "100 Freestyle": 2, "200 Freestyle": 3, "400 Freestyle": 4,
  "800 Freestyle": 5, "1500 Freestyle": 6,
  "50 Breaststroke": 7, "100 Breaststroke": 8, "200 Breaststroke": 9,
  "50 Butterfly": 10, "100 Butterfly": 11, "200 Butterfly": 12,
  "50 Backstroke": 13, "100 Backstroke": 14, "200 Backstroke": 15,
  "200 IM": 16, "200 Individual Medley": 16,
  "400 IM": 17, "400 Individual Medley": 17,
  "100 IM": 18, "100 Individual Medley": 18
};

function buildSwimEnglandHistoryUrl(seNumber, eventName, course = 'S') {
  if (!seNumber) return '';
  if (!eventName || eventName === 'ALL') {
    return `https://www.swimmingresults.org/individualbest/personal_best_time_date.php?back=individualbest&tiref=${seNumber}&mode=A`;
  }
  const cleanEvent = eventName.replace(/\s+/g, ' ').trim();
  const tstroke = EVENT_STROKE_MAP[cleanEvent] || 1;
  const tcourse = (String(course).toUpperCase().includes('L')) ? 'L' : 'S';
  return `https://www.swimmingresults.org/individualbest/personal_best_time_date.php?back=individualbest&tiref=${seNumber}&mode=A&tstroke=${tstroke}&tcourse=${tcourse}`;
}

// 4. ACTIVE SQUAD ROSTER EXTRACTION
function getActiveSquadSwimmerNames() {
    if (!SQUAD_LIST_DATA || !SQUAD_LIST_DATA.length) return [];
    const names = new Set();
    const cols = Object.keys(SQUAD_LIST_DATA[0]);
    cols.forEach(col => {
        SQUAD_LIST_DATA.forEach(r => {
            const val = (r[col] || '').trim();
            if (!val) return;
            const hasNumbers = /\d/.test(val);
            const hasKeyword = /\b(sat|saturday|sun|sunday|mon|tue|wed|thu|fri|am|pm|session)\b/i.test(val);
            if (!hasNumbers || !hasKeyword) {
                names.add(val);
            }
        });
    });
    return Array.from(names).sort();
}

// 5. QUALIFICATION LOOKUPS (COUNTY, BSG L2, DEVLOP '26)
function getCountyInfoForSwimmer(swimmerName, seNumber) {
    if (!COUNTY_SUMMARY || !COUNTY_SUMMARY.length) return null;
    const row = COUNTY_SUMMARY.find(r => {
        const asa = getRowVal(r, ['ASA Number', 'ASA']);
        const name = getRowVal(r, ['Swimmer Name', 'Name']);
        if (seNumber && asa && String(asa) === String(seNumber)) return true;
        if (swimmerName && name && name.toLowerCase() === swimmerName.toLowerCase()) return true;
        return false;
    });
    if (!row) return null;

    const qualifiedCount = Number(getRowVal(row, ['Qualified Events Count', 'Qualified'])) || 0;
    const qualifiedEvents = [];
    const slowerEvents = [];

    for (let i = 1; i <= 15; i++) {
        const val = getRowVal(row, [`Event ${i}`, `Event_${i}`]);
        if (val) {
            if (val.includes('(Qualified)')) {
                qualifiedEvents.push(val.replace('(Qualified)', '').trim());
            } else if (val.includes('(Slower)')) {
                slowerEvents.push(val.replace('(Slower)', '').trim());
            }
        }
    }
    return { qualifiedCount, qualifiedEvents, slowerEvents, rawRow: row };
}

function checkCountyStatusForRecord(swimmerName, seNumber, eventName) {
    const countyInfo = getCountyInfoForSwimmer(swimmerName, seNumber);
    if (!countyInfo) return null;
    const cleanEventName = (eventName || '').toLowerCase().replace(/^(50m|100m|200m|400m|800m|1500m)\s+/, '').trim();
    const isQual = countyInfo.qualifiedEvents.some(evt => evt.toLowerCase().includes(cleanEventName) || cleanEventName.includes(evt.toLowerCase()));
    if (isQual) return 'QUALIFIED';
    const isSlow = countyInfo.slowerEvents.some(evt => evt.toLowerCase().includes(cleanEventName) || cleanEventName.includes(evt.toLowerCase()));
    if (isSlow) return 'SLOWER';
    return null;
}

function getBSGInfoForSwimmer(swimmerName, seNumber) {
    if (!BSG_SUMMARY || !BSG_SUMMARY.length) return null;
    const row = BSG_SUMMARY.find(r => {
        const asa = getRowVal(r, ['ASA Number', 'ASA']);
        const name = getRowVal(r, ['Swimmer Name', 'Name']);
        if (seNumber && asa && String(asa) === String(seNumber)) return true;
        if (swimmerName && name && name.toLowerCase() === swimmerName.toLowerCase()) return true;
        return false;
    });
    if (!row) return null;

    const qualifiedCount = Number(getRowVal(row, ['Qualified Events Count', 'Qualified'])) || 0;
    const qualifiedEvents = [];
    const slowerEvents = [];

    for (let i = 1; i <= 15; i++) {
        const val = getRowVal(row, [`Event ${i}`, `Event_${i}`]);
        if (val) {
            if (val.includes('(Qualified)')) {
                qualifiedEvents.push(val.replace('(Qualified)', '').trim());
            } else if (val.includes('(Slower)')) {
                slowerEvents.push(val.replace('(Slower)', '').trim());
            }
        }
    }
    return { qualifiedCount, qualifiedEvents, slowerEvents, rawRow: row };
}

function checkBSGStatusForRecord(swimmerName, seNumber, eventName) {
    const bsgInfo = getBSGInfoForSwimmer(swimmerName, seNumber);
    if (!bsgInfo) return null;
    const cleanEventName = (eventName || '').toLowerCase().replace(/^(50m|100m|200m|400m|800m|1500m)\s+/, '').trim();
    const isQual = bsgInfo.qualifiedEvents.some(evt => evt.toLowerCase().includes(cleanEventName) || cleanEventName.includes(evt.toLowerCase()));
    if (isQual) return 'QUALIFIED';
    const isSlow = bsgInfo.slowerEvents.some(evt => evt.toLowerCase().includes(cleanEventName) || cleanEventName.includes(evt.toLowerCase()));
    if (isSlow) return 'SLOWER';
    return null;
}

function getDevlopInfoForSwimmer(swimmerName, seNumber) {
    if (!DEVLOP_DATA || !DEVLOP_DATA.length) return null;
    const row = DEVLOP_DATA.find(r => {
        const asa = getRowVal(r, ['ASA Number', 'ASA']);
        const name = getRowVal(r, ['Swimmer Name', 'Name']);
        if (seNumber && asa && String(asa) === String(seNumber)) return true;
        if (swimmerName && name && name.toLowerCase() === swimmerName.toLowerCase()) return true;
        return false;
    });
    if (!row) return null;

    const eligibleEvents = [];
    const tooFastEvents = [];
    const slowerEvents = [];

    for (let i = 1; i <= 15; i++) {
        const val = getRowVal(row, [`Event ${i}`, `Event_${i}`]);
        if (val) {
            if (val.includes('(Too Fast)')) {
                tooFastEvents.push(val.replace('(Too Fast)', '').trim());
            } else if (val.includes('(Slower)')) {
                slowerEvents.push(val.replace('(Slower)', '').trim());
                eligibleEvents.push(val.replace('(Slower)', '').trim());
            } else {
                eligibleEvents.push(val.trim());
            }
        }
    }
    return { eligibleCount: eligibleEvents.length, eligibleEvents, tooFastEvents, slowerEvents, rawRow: row };
}

function checkDevlopStatusForRecord(swimmerName, seNumber, eventName) {
    const devInfo = getDevlopInfoForSwimmer(swimmerName, seNumber);
    if (!devInfo) return null;
    const cleanEventName = (eventName || '').toLowerCase().replace(/^(50m|100m|200m|400m|800m|1500m)\s+/, '').trim();
    const isTooFast = devInfo.tooFastEvents.some(evt => evt.toLowerCase().includes(cleanEventName) || cleanEventName.includes(evt.toLowerCase()));
    if (isTooFast) return 'TOO_FAST';
    const isEligible = devInfo.eligibleEvents.some(evt => evt.toLowerCase().includes(cleanEventName) || cleanEventName.includes(evt.toLowerCase()));
    if (isEligible) return 'ELIGIBLE';
    return null;
}

// 6. SWIMMERS DASHBOARD MODULE
let currentSwimmerForEvents = null;

function updateEventOptions(swimmerName) {
    const eventSelect = document.getElementById('swimmers-event-select');
    if (!eventSelect) return;
    if (currentSwimmerForEvents === swimmerName) return;
    currentSwimmerForEvents = swimmerName;

    const previousSelected = eventSelect.value;
    let availableRecords = RAW_SWIMMERS_DATA;
    if (swimmerName && swimmerName !== 'ALL') {
        availableRecords = RAW_SWIMMERS_DATA.filter(r => (r.swimmerName || '') === swimmerName);
    }
    const uniqueEvents = Array.from(new Set(availableRecords.map(r => r.event).filter(Boolean))).sort();

    eventSelect.innerHTML = '<option value="ALL">All Events</option>';
    uniqueEvents.forEach(evt => {
        const opt = document.createElement('option');
        opt.value = evt;
        opt.textContent = evt;
        eventSelect.appendChild(opt);
    });

    eventSelect.value = (previousSelected && uniqueEvents.includes(previousSelected)) ? previousSelected : 'ALL';
}

function populateSwimmersDropdowns(data) {
    const swimmerSelect = document.getElementById('swimmers-name-select');
    if (!data || !data.length) return;

    if (swimmerSelect && swimmerSelect.options.length <= 2) {
        const squadSwimmers = getActiveSquadSwimmerNames();
        const availableSwimmers = squadSwimmers.length > 0 
            ? squadSwimmers 
            : Array.from(new Set(data.map(r => r.swimmerName).filter(Boolean))).sort();

        swimmerSelect.innerHTML = '<option value="NONE" selected>👤 Choose a Swimmer...</option><option value="ALL">All Swimmers (A-Z)</option>';
        availableSwimmers.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            swimmerSelect.appendChild(opt);
        });
        swimmerSelect.value = 'NONE';
    }
    updateEventOptions('NONE');
}

const SWIMMER_EVENT_ORDER = [
    "50 Freestyle", "100 Freestyle", "200 Freestyle", "400 Freestyle", "800 Freestyle", "1500 Freestyle",
    "50 Backstroke", "100 Backstroke", "200 Backstroke",
    "50 Breaststroke", "100 Breaststroke", "200 Breaststroke",
    "50 Butterfly", "100 Butterfly", "200 Butterfly",
    "100 Individual Medley", "100 IM", "200 Individual Medley", "200 IM", "400 Individual Medley", "400 IM"
];

function getEventSortIndex(evtName) {
    if (!evtName) return 99;
    const clean = String(evtName).trim();
    const idx = SWIMMER_EVENT_ORDER.indexOf(clean);
    return idx !== -1 ? idx : 99;
}

function sortSwimmerRecords(records, isAllSwimmers) {
    return records.sort((a, b) => {
        if (isAllSwimmers) {
            const nameA = (a.swimmerName || '').trim();
            const nameB = (b.swimmerName || '').trim();
            const nameCmp = nameA.localeCompare(nameB);
            if (nameCmp !== 0) return nameCmp;
        }

        const posA = getEventSortIndex(a.event);
        const posB = getEventSortIndex(b.event);
        if (posA !== posB) return posA - posB;

        const evtCmp = (a.event || '').localeCompare(b.event || '');
        if (evtCmp !== 0) return evtCmp;

        const dateA = parseRecordDate(a.date) || new Date(0);
        const dateB = parseRecordDate(b.date) || new Date(0);
        return dateB - dateA;
    });
}

function extractFastestPBs(records) {
    const pbMap = {};
    records.forEach(r => {
        const cCourse = getCourse(r);
        const name = r.swimmerName || 'SWIMMER';
        const key = `${name}_${r.event}_${cCourse}`;
        const tSec = Number(r.timeSec) || 999999;

        if (!pbMap[key] || tSec < (Number(pbMap[key].timeSec) || 999999)) {
            pbMap[key] = { ...r, isPB: true };
        }
    });

    return Object.values(pbMap);
}

function renderSwimmersDashboard(data) {
    const tbody = document.querySelector('#swimmers-table tbody');
    if (!tbody) return;

    const bannerContainer = document.getElementById('swimmer-summary-banner');
    const selectedSwimmer = document.getElementById('swimmers-name-select')?.value;

    if (bannerContainer) {
        if (selectedSwimmer === 'NONE') {
            bannerContainer.innerHTML = `
                <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 14px; padding: 2rem 1.5rem; text-align: center; margin-bottom: 1.25rem;">
                    <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">🏊‍♀️</div>
                    <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.35rem;">Swimmer Profile & Performance Portal</h3>
                    <p style="font-size: 0.875rem; color: var(--text-muted); max-width: 520px; margin: 0 auto; line-height: 1.5;">
                        Please select a swimmer from the <strong>Choose a Swimmer...</strong> dropdown above to view personal bests, Somerset County QTs, BSG L2 standards, and Swim England progression graphs.
                    </p>
                </div>
            `;
            tbody.innerHTML = '<tr><td colspan="12" style="text-align:center; color:var(--text-muted); padding:2.5rem;">Please select a swimmer from the dropdown above to view records.</td></tr>';
            return;
        } else if (selectedSwimmer && selectedSwimmer !== 'ALL' && selectedSwimmer !== 'NONE') {
            const cInfo = getCountyInfoForSwimmer(selectedSwimmer);
            const bsgInfo = getBSGInfoForSwimmer(selectedSwimmer);
            const devInfo = getDevlopInfoForSwimmer(selectedSwimmer);

            let bannerHTML = '';
            if (cInfo && cInfo.qualifiedCount > 0) {
                bannerHTML += `
                    <div style="background: rgba(16,185,129,0.1); border: 1px solid var(--accent-emerald); border-radius: 10px; padding: 0.75rem 1.15rem; margin-bottom: 0.5rem; display:flex; align-items:center; gap:0.75rem;">
                        <span style="font-size:1.4rem;">🏆</span>
                        <div>
                            <div style="font-weight:700; color:var(--accent-emerald); font-size:0.9rem;">Somerset County Championship Qualifier</div>
                            <div style="font-size:0.8rem; color:var(--text-main); margin-top:0.1rem;">
                                Qualified for <strong>${cInfo.qualifiedCount} events</strong>: ${cInfo.qualifiedEvents.join(', ')}
                            </div>
                        </div>
                    </div>
                `;
            }
            if (bsgInfo && bsgInfo.qualifiedCount > 0) {
                bannerHTML += `
                    <div style="background: rgba(139,92,246,0.1); border: 1px solid var(--accent-purple); border-radius: 10px; padding: 0.75rem 1.15rem; margin-bottom: 0.5rem; display:flex; align-items:center; gap:0.75rem;">
                        <span style="font-size:1.4rem;">🏅</span>
                        <div>
                            <div style="font-weight:700; color:var(--accent-purple); font-size:0.9rem;">BSG Level 2 Championship Qualifier</div>
                            <div style="font-size:0.8rem; color:var(--text-main); margin-top:0.1rem;">
                                Qualified for <strong>${bsgInfo.qualifiedCount} events</strong>: ${bsgInfo.qualifiedEvents.join(', ')}
                            </div>
                        </div>
                    </div>
                `;
            }
            if (devInfo && devInfo.eligibleCount > 0) {
                bannerHTML += `
                    <div style="background: rgba(6,182,212,0.1); border: 1px solid var(--accent-cyan); border-radius: 10px; padding: 0.75rem 1.15rem; display:flex; align-items:center; gap:0.75rem;">
                        <span style="font-size:1.4rem;">📈</span>
                        <div>
                            <div style="font-weight:700; color:var(--accent-cyan); font-size:0.9rem;">Development Meet Eligible Races</div>
                            <div style="font-size:0.8rem; color:var(--text-main); margin-top:0.1rem;">
                                Eligible for <strong>${devInfo.eligibleCount} events</strong>: ${devInfo.eligibleEvents.join(', ')} ${devInfo.tooFastEvents.length ? `• <span style="color:var(--accent-rose); font-weight:600;">${devInfo.tooFastEvents.length} Events Too Fast</span>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }
            bannerContainer.innerHTML = bannerHTML;
        } else {
            bannerContainer.innerHTML = '';
        }
    }

    const fullData = RAW_SWIMMERS_DATA || data || [];
    const overviewBadge = document.getElementById('overview-swimmers-badge');
    if (overviewBadge) overviewBadge.innerText = `${fullData.length.toLocaleString()} Raw Times`;

    if (!data || !data.length) {
        tbody.innerHTML = '<tr><td colspan="12" style="text-align:center; color:var(--text-muted); padding:3rem;">No matching swimmer records found.</td></tr>';
        return;
    }

    const displayRows = data.slice(0, 300);
    tbody.innerHTML = displayRows.map(r => {
        const course = getCourse(r);
        const courseBadge = course === 'LC'
            ? `<span style="background:rgba(6,182,212,0.15); color:var(--accent-cyan); border:1px solid var(--accent-cyan); padding:0.15rem 0.5rem; border-radius:4px; font-weight:700; font-size:0.75rem;">50m (LC)</span>`
            : `<span style="background:rgba(217,119,6,0.15); color:var(--accent-amber); border:1px solid var(--accent-amber); padding:0.15rem 0.5rem; border-radius:4px; font-weight:700; font-size:0.75rem;">25m (SC)</span>`;

        const waPoints = r.waPoints ? `<span style="color:${r.waPoints >= 400 ? 'var(--accent-emerald)' : 'var(--text-main)'}; font-weight:700;">${r.waPoints}</span>` : '-';
        const dateStr = formatDateDDMMYYYY(r.date);
        const venueMeet = [r.meetName, r.venue].filter(Boolean).join(' • ');

        const swimmerLink = r.swimmerName 
            ? `<a href="javascript:void(0)" onclick="openSwimmerModal('${r.seNumber || ''}', '${r.swimmerName.replace(/'/g, "\\'")}')" style="color:var(--text-main); font-weight:700; text-decoration:none; border-bottom:1px dashed var(--accent-cyan);" title="Click to view all PBs & details for ${r.swimmerName}">${r.swimmerName} 👤</a>`
            : '-';

        const seEventUrl = buildSwimEnglandHistoryUrl(r.seNumber, r.event, course);
        const seLink = r.seNumber
            ? `<a href="${seEventUrl}" target="_blank" rel="noopener noreferrer" style="color:var(--accent-cyan); text-decoration:underline;" title="Open official Swim England event history for ${r.event}">${r.seNumber} 🔗</a>`
            : '-';

        const cStatus = checkCountyStatusForRecord(r.swimmerName, r.seNumber, r.event);
        const countyBadge = cStatus === 'QUALIFIED'
            ? `<span style="background:rgba(16,185,129,0.15); color:var(--accent-emerald); border:1px solid var(--accent-emerald); padding:0.15rem 0.5rem; border-radius:4px; font-weight:700; font-size:0.75rem;">🏆 Qualified</span>`
            : (cStatus === 'SLOWER' ? `<span style="color:var(--text-muted); font-size:0.75rem;">Slower</span>` : '-');

        const bsgStatus = checkBSGStatusForRecord(r.swimmerName, r.seNumber, r.event);
        const bsgBadge = bsgStatus === 'QUALIFIED'
            ? `<span style="background:rgba(139,92,246,0.15); color:var(--accent-purple); border:1px solid var(--accent-purple); padding:0.15rem 0.5rem; border-radius:4px; font-weight:700; font-size:0.75rem;">🏅 Qualified</span>`
            : (bsgStatus === 'SLOWER' ? `<span style="color:var(--text-muted); font-size:0.75rem;">Slower</span>` : '-');

        const devStatus = checkDevlopStatusForRecord(r.swimmerName, r.seNumber, r.event);
        const devBadge = devStatus === 'ELIGIBLE'
            ? `<span style="background:rgba(6,182,212,0.15); color:var(--accent-cyan); border:1px solid var(--accent-cyan); padding:0.15rem 0.5rem; border-radius:4px; font-weight:700; font-size:0.75rem;">📈 Eligible</span>`
            : (devStatus === 'TOO_FAST' ? `<span style="background:rgba(244,63,94,0.15); color:var(--accent-rose); border:1px solid var(--accent-rose); padding:0.15rem 0.5rem; border-radius:4px; font-weight:700; font-size:0.75rem;">⛔ Too Fast</span>` : '-');

        const pbTag = r.isPB 
            ? `<span style="background:rgba(245,158,11,0.2); color:var(--accent-amber); border:1px solid var(--accent-amber); font-size:0.65rem; padding:0.08rem 0.35rem; border-radius:4px; margin-left:0.3rem; font-weight:800;">⭐ PB</span>`
            : '';

        return `
            <tr>
                <td>${swimmerLink}</td>
                <td style="font-family:monospace;">${seLink}</td>
                <td style="font-weight:600;">${r.event || '-'}</td>
                <td>${courseBadge}</td>
                <td style="font-family:monospace; font-weight:700; color:var(--accent-cyan);">${r.displayTime || '-'}${pbTag}</td>
                <td style="font-family:monospace; color:var(--text-muted);">${r.convertedTime || '-'}</td>
                <td>${waPoints}</td>
                <td style="color:var(--text-muted);">${dateStr}</td>
                <td style="color:var(--text-muted); font-size:0.8rem; max-width:210px; overflow:hidden; text-overflow:ellipsis;" title="${venueMeet}">${venueMeet}</td>
                <td>${countyBadge}</td>
                <td>${bsgBadge}</td>
                <td>${devBadge}</td>
            </tr>
        `;
    }).join('');
}

function filterSwimmers() {
    const swimmerSelect = document.getElementById('swimmers-name-select');
    const swimmerName = swimmerSelect?.value || 'NONE';

    if (swimmerName === 'NONE') {
        renderSwimmersDashboard([]);
        return;
    }

    updateEventOptions(swimmerName);

    const modeVal = document.getElementById('swimmers-mode-select')?.value || 'PB';
    const eventVal = document.getElementById('swimmers-event-select')?.value || 'ALL';
    const courseVal = document.getElementById('swimmers-course-select')?.value || 'ALL';
    const countyVal = document.getElementById('swimmers-county-select')?.value || 'ALL';
    const bsgVal = document.getElementById('swimmers-bsg-select')?.value || 'ALL';
    const devlopVal = document.getElementById('swimmers-devlop-select')?.value || 'ALL';
    const timeframeVal = document.getElementById('swimmers-timeframe-select')?.value || 'ALL';

    const squadSwimmersSet = new Set(getActiveSquadSwimmerNames());

    let cutoffDate = null;
    let seasonYear = null;
    const now = new Date();

    if (timeframeVal === '12M') {
        cutoffDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    } else if (timeframeVal === '6M') {
        cutoffDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    } else if (timeframeVal === '2026') {
        seasonYear = 2026;
    }

    let filtered = RAW_SWIMMERS_DATA.filter(r => {
        const matchesSquadRoster = (swimmerName !== 'ALL') || (squadSwimmersSet.size === 0 || squadSwimmersSet.has(r.swimmerName));
        const matchesName = swimmerName === 'ALL' || (r.swimmerName || '') === swimmerName;
        const matchesEvent = eventVal === 'ALL' || (r.event || '') === eventVal;
        const matchesCourse = courseVal === 'ALL' || getCourse(r) === courseVal;
        const matchesCounty = countyVal === 'ALL' || (countyVal === 'QUALIFIED' && checkCountyStatusForRecord(r.swimmerName, r.seNumber, r.event) === 'QUALIFIED');
        const matchesBSG = bsgVal === 'ALL' || (bsgVal === 'QUALIFIED' && checkBSGStatusForRecord(r.swimmerName, r.seNumber, r.event) === 'QUALIFIED');
        const matchesDevlop = devlopVal === 'ALL' || (devlopVal === 'ELIGIBLE' && checkDevlopStatusForRecord(r.swimmerName, r.seNumber, r.event) === 'ELIGIBLE');

        let matchesTimeframe = true;
        if (cutoffDate || seasonYear) {
            const recDate = parseRecordDate(r.date);
            if (!recDate) {
                matchesTimeframe = false;
            } else if (cutoffDate && recDate < cutoffDate) {
                matchesTimeframe = false;
            } else if (seasonYear && recDate.getFullYear() !== seasonYear) {
                matchesTimeframe = false;
            }
        }

        return matchesSquadRoster && matchesName && matchesEvent && matchesCourse && matchesCounty && matchesBSG && matchesDevlop && matchesTimeframe;
    });

    if (modeVal === 'PB') {
        filtered = extractFastestPBs(filtered);
    }

    sortSwimmerRecords(filtered, swimmerName === 'ALL');

    renderSwimmersDashboard(filtered);
}

function openSwimmerModal(seNum, name) {
    const records = RAW_SWIMMERS_DATA.filter(r => (r.seNumber && String(r.seNumber) === String(seNum)) || (r.swimmerName && r.swimmerName.toLowerCase() === (name || '').toLowerCase()));
    if (!records.length) return;

    const swimmerName = records[0].swimmerName || name;
    const seNumber = records[0].seNumber || seNum;

    const titleElem = document.getElementById('swimmer-modal-name');
    const subElem = document.getElementById('swimmer-modal-sub');
    if (titleElem) titleElem.innerText = `🏊 ${swimmerName} - Personal Bests`;
    if (subElem) {
        const lcHistoryUrl = buildSwimEnglandHistoryUrl(seNumber, '50 Freestyle', 'L');
        const scHistoryUrl = buildSwimEnglandHistoryUrl(seNumber, '50 Freestyle', 'S');
        subElem.innerHTML = `SE Number: <strong style="color:var(--accent-cyan);">${seNumber}</strong> &bull; <a href="https://www.swimmingresults.org/individualbest/personal_best_time_date.php?back=individualbest&tiref=${seNumber}&mode=A" target="_blank" rel="noopener noreferrer" style="color:var(--accent-blue); text-decoration:underline;">Official Swim England Page 🔗</a> &bull; <a href="${lcHistoryUrl}" id="se-lc-history-link" target="_blank" rel="noopener noreferrer" style="color:var(--accent-cyan); text-decoration:underline;">LC Progression 📊</a> &bull; <a href="${scHistoryUrl}" id="se-sc-history-link" target="_blank" rel="noopener noreferrer" style="color:var(--accent-amber); text-decoration:underline;">SC Progression 📊</a>`;
    }

    const cInfo = getCountyInfoForSwimmer(swimmerName, seNumber);
    const bsgInfo = getBSGInfoForSwimmer(swimmerName, seNumber);
    const devInfo = getDevlopInfoForSwimmer(swimmerName, seNumber);

    let summaryBannersHTML = '';
    if (cInfo && cInfo.qualifiedCount > 0) {
        summaryBannersHTML += `
            <div style="background: rgba(16,185,129,0.12); border: 1px solid var(--accent-emerald); border-radius: 10px; padding: 0.75rem 1.15rem; margin-bottom: 0.6rem; display:flex; align-items:center; gap:0.75rem;">
                <span style="font-size:1.4rem;">🏆</span>
                <div>
                    <div style="font-weight:700; color:var(--accent-emerald); font-size:0.9rem;">Somerset County Championship Qualifier</div>
                    <div style="font-size:0.8rem; color:var(--text-main); margin-top:0.1rem;">
                        Qualified for <strong>${cInfo.qualifiedCount} events</strong>: ${cInfo.qualifiedEvents.join(', ')}
                    </div>
                </div>
            </div>
        `;
    }
    if (bsgInfo && bsgInfo.qualifiedCount > 0) {
        summaryBannersHTML += `
            <div style="background: rgba(139,92,246,0.12); border: 1px solid var(--accent-purple); border-radius: 10px; padding: 0.75rem 1.15rem; margin-bottom: 0.6rem; display:flex; align-items:center; gap:0.75rem;">
                <span style="font-size:1.4rem;">🏅</span>
                <div>
                    <div style="font-weight:700; color:var(--accent-purple); font-size:0.9rem;">BSG Level 2 Championship Qualifier</div>
                    <div style="font-size:0.8rem; color:var(--text-main); margin-top:0.1rem;">
                        Qualified for <strong>${bsgInfo.qualifiedCount} events</strong>: ${bsgInfo.qualifiedEvents.join(', ')}
                    </div>
                </div>
            </div>
        `;
    }
    if (devInfo && devInfo.eligibleCount > 0) {
        summaryBannersHTML += `
            <div style="background: rgba(6,182,212,0.12); border: 1px solid var(--accent-cyan); border-radius: 10px; padding: 0.75rem 1.15rem; margin-bottom: 0.8rem; display:flex; align-items:center; gap:0.75rem;">
                <span style="font-size:1.4rem;">📈</span>
                <div>
                    <div style="font-weight:700; color:var(--accent-cyan); font-size:0.9rem;">Development Meet Eligible Races</div>
                    <div style="font-size:0.8rem; color:var(--text-main); margin-top:0.1rem;">
                        Eligible for <strong>${devInfo.eligibleCount} events</strong>: ${devInfo.eligibleEvents.join(', ')} ${devInfo.tooFastEvents.length ? `• <span style="color:var(--accent-rose); font-weight:600;">${devInfo.tooFastEvents.length} Events Too Fast</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    const pbMap = {};
    records.forEach(r => {
        const cCourse = getCourse(r);
        const key = `${r.event}_${cCourse}`;
        const tSec = Number(r.timeSec) || 999999;
        if (!pbMap[key] || tSec < (Number(pbMap[key].timeSec) || 999999)) {
            pbMap[key] = r;
        }
    });

    const pbList = Object.values(pbMap).sort((a, b) => (a.event || '').localeCompare(b.event || ''));
    const bodyElem = document.getElementById('swimmer-modal-body');
    if (bodyElem) {
        bodyElem.innerHTML = `
            ${summaryBannersHTML}
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.75rem;">
                ${pbList.map(pb => {
                    const cCourse = getCourse(pb);
                    const courseBadge = cCourse === 'LC'
                        ? `<span style="background:rgba(6,182,212,0.15); color:var(--accent-cyan); border:1px solid var(--accent-cyan); padding:0.1rem 0.4rem; border-radius:4px; font-weight:700; font-size:0.7rem;">50m (LC)</span>`
                        : `<span style="background:rgba(217,119,6,0.15); color:var(--accent-amber); border:1px solid var(--accent-amber); padding:0.1rem 0.4rem; border-radius:4px; font-weight:700; font-size:0.7rem;">25m (SC)</span>`;
                    
                    const cStatus = checkCountyStatusForRecord(swimmerName, seNumber, pb.event);
                    const countyCardBadge = cStatus === 'QUALIFIED'
                        ? `<span style="background:rgba(16,185,129,0.15); color:var(--accent-emerald); border:1px solid var(--accent-emerald); padding:0.1rem 0.4rem; border-radius:4px; font-weight:700; font-size:0.7rem;">🏆 County QT</span>`
                        : '';

                    const bsgStatus = checkBSGStatusForRecord(swimmerName, seNumber, pb.event);
                    const bsgCardBadge = bsgStatus === 'QUALIFIED'
                        ? `<span style="background:rgba(139,92,246,0.15); color:var(--accent-purple); border:1px solid var(--accent-purple); padding:0.1rem 0.4rem; border-radius:4px; font-weight:700; font-size:0.7rem;">🏅 BSG L2</span>`
                        : '';

                    const devStatus = checkDevlopStatusForRecord(swimmerName, seNumber, pb.event);
                    const devCardBadge = devStatus === 'ELIGIBLE'
                        ? `<span style="background:rgba(6,182,212,0.15); color:var(--accent-cyan); border:1px solid var(--accent-cyan); padding:0.1rem 0.4rem; border-radius:4px; font-weight:700; font-size:0.7rem;">📈 Dev Eligible</span>`
                        : (devStatus === 'TOO_FAST' ? `<span style="background:rgba(244,63,94,0.15); color:var(--accent-rose); border:1px solid var(--accent-rose); padding:0.1rem 0.4rem; border-radius:4px; font-weight:700; font-size:0.7rem;">⛔ Dev Too Fast</span>` : '');

                    const seCardUrl = buildSwimEnglandHistoryUrl(seNumber, pb.event, cCourse);

                    return `
                        <div style="background: rgba(15,23,42,0.6); border: 1px solid var(--border-color); border-radius: 10px; padding: 0.85rem;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.25rem;">
                                <span style="font-weight:700; font-size:0.85rem;">${pb.event}</span>
                                <div style="display:flex; gap:0.25rem; flex-wrap:wrap;">${courseBadge}${countyCardBadge}${bsgCardBadge}${devCardBadge}</div>
                            </div>
                            <div style="font-family:monospace; font-size:1.25rem; font-weight:800; color:var(--accent-cyan); margin: 0.25rem 0;">
                                ${pb.displayTime || '-'}
                            </div>
                            <div style="font-size:0.75rem; color:var(--text-muted);">
                                ${formatDateDDMMYYYY(pb.date)} ${pb.waPoints ? `&bull; <strong style="color:var(--accent-emerald);">${pb.waPoints} pts</strong>` : ''}
                            </div>
                            <div style="font-size:0.7rem; color:var(--text-muted); margin-top:0.2rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${pb.meetName || ''}">
                                ${pb.meetName || '-'}
                            </div>
                            <div style="margin-top:0.45rem; padding-top:0.35rem; border-top:1px dashed rgba(255,255,255,0.1); font-size:0.725rem;">
                                <a href="${seCardUrl}" target="_blank" rel="noopener noreferrer" style="color:var(--accent-cyan); text-decoration:underline; font-weight:600;">📊 SE Progression 🔗</a>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
    document.getElementById('swimmer-profile-modal')?.classList.remove('hidden');
}

function closeSwimmerModal() {
    document.getElementById('swimmer-profile-modal')?.classList.add('hidden');
}

// 7. SQUAD MOVEMENTS MODULE
function renderSquadList() {
    const container = document.getElementById('squad-grid');
    if (!container || !SQUAD_LIST_DATA || !SQUAD_LIST_DATA.length) return;

    const cols = Object.keys(SQUAD_LIST_DATA[0]);
    container.innerHTML = cols.map(col => {
        const parts = col.split(/\r?\n/);
        const title = parts[0];
        const schedule = parts.slice(1).join(' • ');

        const headerHTML = schedule 
            ? `${title}<div style="font-size:0.75rem; font-weight:600; color:var(--accent-cyan); margin-top:0.35rem;">⏰ ${schedule}</div>`
            : title;

        const members = [];
        let extraScheduleNote = '';

        SQUAD_LIST_DATA.forEach(r => {
            const val = (r[col] || '').trim();
            if (!val) return;

            const hasNumbers = /\d/.test(val);
            const hasKeyword = /\b(sat|saturday|sun|sunday|mon|tue|wed|thu|fri|am|pm|session)\b/i.test(val);

            if (hasNumbers && hasKeyword) {
                extraScheduleNote = val;
            } else {
                members.push(val);
            }
        });

        const extraBadge = extraScheduleNote 
            ? `<div style="background:rgba(245,158,11,0.15); border:1px solid var(--accent-amber); color:var(--accent-amber); padding:0.4rem 0.6rem; border-radius:6px; font-weight:700; font-size:0.75rem; margin-bottom:0.6rem; text-align:center;">🗓️ ${extraScheduleNote}</div>` 
            : '';

        return `
            <div class="squad-column">
                <h3>${headerHTML}</h3>
                ${extraBadge}
                ${members.map(m => `<div class="squad-member">${m}</div>`).join('')}
            </div>
        `;
    }).join('');
}

// 8. MEET CALENDAR MODULE
function renderCalendar(data) {
    const tbody = document.getElementById('calendar-table-body');
    const calendarList = data || CALENDAR_DATA || [];
    if (!tbody) return;

    const calendarBadge = document.getElementById('overview-calendar-badge');
    if (calendarBadge) calendarBadge.innerText = `${CALENDAR_DATA.length} Events Scheduled`;

    if (!calendarList.length) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--text-muted); padding:2rem;">No gala or calendar events found.</td></tr>';
        return;
    }

    tbody.innerHTML = calendarList.map(c => {
        const rawDate = getRowVal(c, ['Date', 'Gala Date', 'Day', 'Start Date', 'Date ']);
        const formattedDate = formatDateDDMMYYYY(rawDate);
        const eventTitle = getRowVal(c, ['Event', 'Event ', 'Gala', 'Meet', 'Title', 'Event Title', 'Competition']);
        const venue = getRowVal(c, ['Where', 'Venue', 'Location', 'Pool', 'Where ']);

        return `
            <tr>
                <td style="font-weight:700; color:var(--accent-amber); font-family:monospace;">${formattedDate}</td>
                <td style="font-weight:600; color:var(--text-main);">${eventTitle || '-'}</td>
                <td style="color:var(--text-muted);">${venue || '-'}</td>
            </tr>
        `;
    }).join('');
}

function filterCalendar() {
    const q = (document.getElementById('calendar-search')?.value || '').toLowerCase().trim();
    if (!q) {
        renderCalendar(CALENDAR_DATA);
        return;
    }
    const filtered = CALENDAR_DATA.filter(c => {
        const dateStr = getRowVal(c, ['Date', 'Gala Date', 'Day', 'Start Date', 'Date ']);
        const eventTitle = getRowVal(c, ['Event', 'Event ', 'Gala', 'Meet', 'Title', 'Event Title', 'Competition']);
        const venue = getRowVal(c, ['Where', 'Venue', 'Location', 'Pool', 'Where ']);

        const fullText = [dateStr, formatDateDDMMYYYY(dateStr), eventTitle, venue].join(' ').toLowerCase();
        return fullText.includes(q);
    });
    renderCalendar(filtered);
}

// 9. CLUB NOTICES MODULE
let NOTICES_DATA = [];

const GOOGLE_DOC_NOTICES_URL = 'https://docs.google.com/document/d/162h7jE0QUw0hVjhIOxveD9fqOItu9tVwBC5eBA70iyA/export?format=txt';

const DEFAULT_NOTICES = [
    {
        title: "Somerset County Championships 2026 Entries",
        date: "20/08/2026",
        priority: "Urgent",
        summary: "Closing date for Somerset County Championship entry submissions is Friday 12th September.",
        content: "Swimmers and parents please check your Somerset County QT badges on the Swimmers Dashboard to verify qualified events. Entry confirmations must be submitted to the team manager prior to 5:00 PM on Friday 12th September.",
        linkUrl: "javascript:void(0)",
        linkOnClick: "switchView('swimmers')",
        linkText: "Check County Times 🏆"
    },
    {
        title: "Autumn Squad Training Schedule & Pool Update",
        date: "15/08/2026",
        priority: "Info",
        summary: "Training schedules at Hutton Moor for Performance and Development squads.",
        content: "Squad training times for the autumn term remain unchanged. Please ensure all swimmers arrive 10 minutes prior to session start times with full training equipment.",
        linkUrl: "",
        linkOnClick: "",
        linkText: ""
    }
];

function parseGoogleDocNotices(rawText) {
    if (!rawText) return [];
    const cleanText = rawText.replace(/\uFEFF/g, '').trim();
    const blocks = cleanText.split(/(?=\bPRIORITY\s*:)/i).filter(b => b.trim());
    return blocks.map(block => {
        const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const notice = {};
        lines.forEach(line => {
            const colonIdx = line.indexOf(':');
            if (colonIdx !== -1) {
                const key = line.substring(0, colonIdx).trim().toUpperCase();
                const val = line.substring(colonIdx + 1).trim();
                if (key === 'PRIORITY') notice.priority = (val.toLowerCase().includes('urg') ? 'Urgent' : 'Info');
                else if (key === 'TITLE') notice.title = val;
                else if (key === 'DATE' || key === 'EVENTDATE') notice.date = val;
                else if (key === 'SUMMARY') notice.summary = val;
                else if (key === 'ENTRY' || key === 'CONTENT' || key === 'DETAILS') notice.content = val;
            }
        });
        if (notice.title) {
            if (!notice.priority) notice.priority = 'Info';
            if (!notice.summary) notice.summary = notice.content || notice.title;
            if (!notice.content) notice.content = notice.summary;
            return notice;
        }
        return null;
    }).filter(Boolean);
}

async function loadGoogleDocNotices() {
    try {
        const response = await fetch(GOOGLE_DOC_NOTICES_URL + '&t=' + Date.now());
        if (response.ok) {
            const text = await response.text();
            const parsed = parseGoogleDocNotices(text);
            if (parsed && parsed.length > 0) {
                NOTICES_DATA = parsed;
                const noticesBadge = document.getElementById('overview-notices-badge');
                if (noticesBadge) {
                    noticesBadge.innerText = `${NOTICES_DATA.length} Active Notice${NOTICES_DATA.length === 1 ? '' : 's'}`;
                }
                renderTopAnnouncementBanner();
            }
        }
    } catch (err) {
        console.warn("Could not fetch live Google Doc notices, falling back to local dataset:", err);
    }
}

function renderClubNotices() {
    const rawNotices = getDataset(window.MASTER_DASHBOARD_DATA || {}, ["Notices", "Club Notices", "Announcements", "Club News", "News"]);
    NOTICES_DATA = (rawNotices && rawNotices.length) ? rawNotices : DEFAULT_NOTICES;

    const noticesBadge = document.getElementById('overview-notices-badge');
    if (noticesBadge) {
        noticesBadge.innerText = `${NOTICES_DATA.length} Active Notice${NOTICES_DATA.length === 1 ? '' : 's'}`;
    }
    renderTopAnnouncementBanner();
    loadGoogleDocNotices();
}

function renderTopAnnouncementBanner() {
    const bannerContainer = document.getElementById('top-announcement-banner');
    if (!bannerContainer || !NOTICES_DATA.length) return;

    if (sessionStorage.getItem('dismissed_top_banner') === 'true') {
        bannerContainer.innerHTML = '';
        return;
    }

    const topNotice = NOTICES_DATA.find(n => (getRowVal(n, ['Priority', 'Type']).toLowerCase() === 'urgent')) || NOTICES_DATA[0];
    if (!topNotice) return;

    const title = getRowVal(topNotice, ['Title', 'Heading', 'Notice']) || topNotice.title;
    const summary = getRowVal(topNotice, ['Summary', 'Short Message', 'Message']) || topNotice.summary || topNotice.content;
    const dateStr = formatDateDDMMYYYY(getRowVal(topNotice, ['Date', 'Created']) || topNotice.date);
    const priority = getRowVal(topNotice, ['Priority', 'Type']) || topNotice.priority || 'Info';
    
    const isUrgent = priority.toLowerCase() === 'urgent';
    const bgStyle = isUrgent 
        ? 'background: rgba(239,68,68,0.12); border: 1px solid var(--accent-rose);' 
        : 'background: rgba(245,158,11,0.12); border: 1px solid var(--accent-amber);';
    
    const icon = isUrgent ? '🚨' : '📢';
    const badgeColor = isUrgent ? 'var(--accent-rose)' : 'var(--accent-amber)';

    bannerContainer.innerHTML = `
        <div style="${bgStyle} border-radius: 12px; padding: 0.85rem 1.25rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 0.85rem; flex: 1; min-width: 260px;">
                <span style="font-size: 1.5rem;">${icon}</span>
                <div>
                    <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap: wrap;">
                        <span style="background: ${badgeColor}; color: #0f172a; font-weight: 800; font-size: 0.65rem; padding: 0.1rem 0.4rem; border-radius: 4px; text-transform: uppercase;">${priority}</span>
                        <strong style="color: var(--text-main); font-size: 0.95rem;">${title}</strong>
                        <span style="color: var(--text-muted); font-size: 0.75rem;">(${dateStr})</span>
                    </div>
                    <div style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.2rem;">
                        ${summary}
                    </div>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0;">
                <button onclick="openNoticesModal()" style="background: rgba(255,255,255,0.08); border: 1px solid var(--border-color); color: var(--text-main); padding: 0.35rem 0.75rem; border-radius: 6px; font-weight: 600; font-size: 0.8rem; cursor: pointer;">Read Details 📖</button>
                <button onclick="dismissTopBanner()" style="background: none; border: none; color: var(--text-muted); font-size: 1.25rem; cursor: pointer;" title="Dismiss banner">&times;</button>
            </div>
        </div>
    `;
}

function dismissTopBanner() {
    sessionStorage.setItem('dismissed_top_banner', 'true');
    const container = document.getElementById('top-announcement-banner');
    if (container) container.innerHTML = '';
}

function openNoticesModal() {
    const bodyElem = document.getElementById('notices-modal-body');
    if (!bodyElem) return;

    const list = NOTICES_DATA.length ? NOTICES_DATA : DEFAULT_NOTICES;
    bodyElem.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 1rem;">
            ${list.map(n => {
                const title = getRowVal(n, ['Title', 'Heading', 'Notice']) || n.title;
                const dateStr = formatDateDDMMYYYY(getRowVal(n, ['Date', 'Created']) || n.date);
                const priority = getRowVal(n, ['Priority', 'Type']) || n.priority || 'Info';
                const content = getRowVal(n, ['Content', 'Message', 'Details', 'Body']) || n.content || n.summary;
                const linkText = getRowVal(n, ['Link Text', 'Button Text']) || n.linkText;
                const linkUrl = getRowVal(n, ['Link URL', 'URL', 'Link']) || n.linkUrl;
                const linkOnClick = n.linkOnClick || '';

                const isUrgent = priority.toLowerCase() === 'urgent';
                const borderStyle = isUrgent ? 'border-left: 4px solid var(--accent-rose);' : 'border-left: 4px solid var(--accent-amber);';
                const tagColor = isUrgent ? 'background: rgba(239,68,68,0.2); color: var(--accent-rose);' : 'background: rgba(245,158,11,0.2); color: var(--accent-amber);';

                const actionButton = (linkText && (linkUrl || linkOnClick))
                    ? `<a href="${linkUrl || 'javascript:void(0)'}" ${linkOnClick ? `onclick="${linkOnClick}; closeNoticesModal();"` : ''} style="display:inline-block; margin-top:0.6rem; background: rgba(6,182,212,0.15); color: var(--accent-cyan); border: 1px solid var(--accent-cyan); padding: 0.35rem 0.75rem; border-radius: 6px; font-weight: 700; font-size: 0.8rem; text-decoration: none;">${linkText}</a>`
                    : '';

                return `
                    <div style="background: rgba(15,23,42,0.6); border: 1px solid var(--border-color); ${borderStyle} border-radius: 10px; padding: 1.1rem;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.4rem;">
                            <span style="${tagColor} font-weight: 800; font-size: 0.7rem; padding: 0.15rem 0.5rem; border-radius: 4px; text-transform: uppercase;">${priority}</span>
                            <span style="font-size: 0.75rem; color: var(--text-muted); font-family: monospace;">${dateStr}</span>
                        </div>
                        <h4 style="font-size: 1.05rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.4rem;">${title}</h4>
                        <div style="font-size: 0.875rem; color: var(--text-muted); line-height: 1.5;">
                            ${content}
                        </div>
                        ${actionButton}
                    </div>
                `;
            }).join('')}
        </div>
    `;
    document.getElementById('notices-modal')?.classList.remove('hidden');
}

function closeNoticesModal() {
    document.getElementById('notices-modal')?.classList.add('hidden');
}

// 10. INITIALIZATION
function initDashboard() {
    try {
        const rawData = window.MASTER_DASHBOARD_DATA || (typeof MASTER_DASHBOARD_DATA !== 'undefined' ? MASTER_DASHBOARD_DATA : null);
        RAW_SWIMMERS_DATA = window.RAW_DATA || (typeof RAW_DATA !== 'undefined' ? RAW_DATA : []);

        if (rawData) {
            CALENDAR_DATA = getDataset(rawData, ["Calendar", "Gala Calendar", "Events", "Gala_Calendar", "Meet Calendar", "Schedule"]);
            const rawCounty = getDataset(rawData, ["County Times", "Somerset County", "County"]);
            COUNTY_SUMMARY = rawCounty.filter(row => {
                const name = getRowVal(row, ['Swimmer Name', 'Name', 'Selected Name']);
                const asa  = getRowVal(row, ['ASA Number', 'ASA']);
                return name && name !== 'Age Group Qualification Summary' && asa !== 'Swimmer Name';
            });
            const rawBSG = getDataset(rawData, ["BSG L2", "BSG Level 2", "BSG"]);
            BSG_SUMMARY = rawBSG.filter(row => {
                const name = getRowVal(row, ['Swimmer Name', 'Name', 'Selected Name']);
                const asa  = getRowVal(row, ['ASA Number', 'ASA']);
                return name && asa !== 'Swimmer Name';
            });
            const rawDevlop = getDataset(rawData, ["Devlop 26", "Devlop '26", "Devlop"]);
            DEVLOP_DATA = rawDevlop.filter(row => {
                const name = getRowVal(row, ['Swimmer Name', 'Name', 'Selected Name']);
                const asa  = getRowVal(row, ['ASA Number', 'ASA']);
                return name && asa !== 'Swimmer Name';
            });
            SQUAD_LIST_DATA = getDataset(rawData, ["Sept_Movements", "Squad Movements", "Movements"]);
            renderClubNotices();
        }

        if (document.querySelector('#swimmers-table tbody')) {
            populateSwimmersDropdowns(RAW_SWIMMERS_DATA);
            filterSwimmers();
        }
        if (document.getElementById('squad-grid')) renderSquadList();
        if (document.getElementById('calendar-table-body')) renderCalendar();

    } catch (err) {
        console.error("Swimmers Hub initialization error:", err);
    }
}

// Global Exports
window.switchView = switchView;
window.filterSwimmers = filterSwimmers;
window.filterCalendar = filterCalendar;
window.EVENT_STROKE_MAP = EVENT_STROKE_MAP;
window.buildSwimEnglandHistoryUrl = buildSwimEnglandHistoryUrl;
window.openSwimmerModal = openSwimmerModal;
window.closeSwimmerModal = closeSwimmerModal;
window.openNoticesModal = openNoticesModal;
window.closeNoticesModal = closeNoticesModal;
window.dismissTopBanner = dismissTopBanner;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}
window.addEventListener('load', initDashboard);
