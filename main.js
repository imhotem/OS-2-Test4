let editingId = null;

document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('toggleBtn');
    const studentForm = document.getElementById('studentForm');
    const cancelBtn = document.getElementById('cancelBtn');

    if (toggleBtn) {
        toggleBtn.addEventListener('click', switchPage);
    }
    if (studentForm) {
        studentForm.addEventListener('submit', handleFormSubmit);
    }
    if (cancelBtn) {
        cancelBtn.addEventListener('click', resetFormMode);
    }

    renderStudentList();
});

function switchPage() {
    const addPage = document.getElementById('addPage');
    const listPage = document.getElementById('listPage');
    const toggleBtn = document.getElementById('toggleBtn');
    if (!addPage || !listPage || !toggleBtn) return;

    const showingAdd = addPage.classList.contains('active');
    addPage.classList.toggle('active', !showingAdd);
    listPage.classList.toggle('active', showingAdd);
    toggleBtn.textContent = showingAdd ? '新增學員資料' : '學生資料瀏覽';

    if (showingAdd) {
        renderStudentList();
    }
}

function parseStudents(payload) {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.data)) return payload.data;
    return [];
}

function mapStudent(s) {
    if (!s) return s;
    return {
        id: String(s.id ?? s.sid ?? ''),
        name: s.name ?? s.sname ?? '',
        gender: s.gender ?? s.sgender ?? '',
        school: s.school ?? s.sschool ?? '',
        grade: s.grade ?? s.sgrade ?? '',
        className: s.className ?? s.student_class ?? s.class ?? s.sclass ?? ''
    };
}

async function renderStudentList() {
    const tbody = document.getElementById('studentTableBody');
    if (!tbody) return;

    try {
        const res = await fetch('/api/students');
        const payload = await res.json();
        if (!res.ok) {
            tbody.innerHTML = `<tr><td colspan="5" class="empty-msg">${payload.error || '無法載入學員資料'}</td></tr>`;
            return;
        }

        const students = parseStudents(payload).map(mapStudent);

        tbody.innerHTML = '';
        if (students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-msg">目前尚無學員資料</td></tr>';
            return;
        }

        students.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));

        students.forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="student-id">${s.id}</td>
                <td>${s.name}</td>
                <td>${s.gender}</td>
                <td>${s.school}</td>
                <td><button type="button" class="btn-edit" data-id="${s.id}">修改</button></td>
            `;
            const editBtn = tr.querySelector('.btn-edit');
            editBtn.addEventListener('click', () => prepareEdit(s.id));
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('無法讀取學員資料:', err);
        tbody.innerHTML = '<tr><td colspan="5" class="empty-msg">無法連線至伺服器，請確認 API 是否啟動</td></tr>';
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();
    const sid = document.getElementById('sid').value.trim();
    const sname = document.getElementById('sname').value.trim();
    const sgender = document.getElementById('sgender').value;
    const sschool = document.getElementById('sschool').value.trim();
    const sgrade = document.getElementById('sgrade').value.trim();
    const sclass = document.getElementById('sclass').value.trim();

    const payload = {
        id: sid,
        name: sname,
        gender: sgender,
        school: sschool,
        grade: sgrade,
        className: sclass,
        student_class: sclass
    };

    if (editingId === null) {
        try {
            const res = await fetch('/api/students', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok) {
                alert(data.error || '新增失敗');
                return;
            }
            alert('新增成功！資料已寫入 AWS RDS MySQL。');
            document.getElementById('studentForm').reset();
        } catch (err) {
            alert('連線失敗');
        }
    } else {
        try {
            const res = await fetch(`/api/students/${encodeURIComponent(editingId)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                alert(data.error || '修改失敗');
                return;
            }
            alert(`學員編號 "${editingId}" 修改成功！`);
            resetFormMode();
        } catch (err) {
            alert('連線失敗');
        }
    }
}

async function prepareEdit(id) {
    try {
        const res = await fetch('/api/students');
        const payload = await res.json();
        const students = parseStudents(payload).map(mapStudent);
        const target = students.find(s => s.id === String(id));
        if (!target) return;

        editingId = target.id;
        document.getElementById('sid').value = target.id;
        document.getElementById('sid').disabled = true;
        document.getElementById('sname').value = target.name;
        document.getElementById('sgender').value = target.gender;
        document.getElementById('sschool').value = target.school;
        document.getElementById('sgrade').value = target.grade || '';
        document.getElementById('sclass').value = target.className || '';

        document.getElementById('formPageTitle').textContent = '學員資料修改介面';
        document.getElementById('formCardTitle').textContent = `修改學員資料 (編號: ${target.id})`;
        document.getElementById('submitBtn').textContent = '確認修改';
        document.getElementById('submitBtn').style.backgroundColor = '#2563eb';
        document.getElementById('cancelBtn').style.display = 'block';

        document.getElementById('addPage').classList.add('active');
        document.getElementById('listPage').classList.remove('active');
        document.getElementById('toggleBtn').textContent = '學生資料瀏覽';
    } catch (err) {
        console.error('讀取失敗:', err);
    }
}

function resetFormMode() {
    editingId = null;
    document.getElementById('studentForm').reset();
    document.getElementById('sid').disabled = false;
    document.getElementById('formPageTitle').textContent = '學員資料新增介面';
    document.getElementById('formCardTitle').textContent = '新增學員資料';
    document.getElementById('submitBtn').textContent = '確認新增';
    document.getElementById('submitBtn').style.backgroundColor = '#16a34a';
    document.getElementById('cancelBtn').style.display = 'none';
}

window.switchPage = switchPage;
window.handleFormSubmit = handleFormSubmit;
window.prepareEdit = prepareEdit;
window.resetFormMode = resetFormMode;
