const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());

// 1. 設定靜態檔案提供
app.use(express.static(path.join(__dirname, '.')));

// 2. 首頁路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 3. AWS RDS MySQL 連線配置
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// 4. API - 健康檢查
app.get('/api/health', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT 1 + 1 AS result');
        await connection.end();
        res.json({ status: "ok", message: "AWS RDS 資料庫連線成功！", data: rows });
    } catch (error) {
        res.status(500).json({ status: "error", error: error.message });
    }
});

function mapStudentRow(row) {
    return {
        id: row.id ?? row.sid,
        name: row.name ?? row.sname,
        gender: row.gender ?? row.sgender,
        school: row.school ?? row.sschool,
        grade: row.grade ?? row.sgrade,
        className: row.className ?? row.student_class ?? row.class ?? row.sclass ?? '',
        student_class: row.student_class ?? row.className ?? row.class ?? row.sclass ?? ''
    };
}

function getClassValue(body) {
    return body.student_class ?? body.className ?? body.class ?? '';
}

// 5. API - 取得所有學生資料 (供「學生資料瀏覽」按鈕呼叫)
app.get('/api/students', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        // 請確認您的資料庫表名是否為 students，若不同可自行調整
        const [rows] = await connection.execute('SELECT * FROM students');
        await connection.end();
        res.json({ status: "success", data: rows.map(mapStudentRow) });
    } catch (error) {
        console.error("Fetch students error:", error);
        res.status(500).json({ status: "error", error: error.message });
    }
});

// 6. API - 新增學生資料
app.post('/api/students', async (req, res) => {
    const { id, name, gender, school, grade } = req.body;
    const student_class = getClassValue(req.body);
    try {
        const connection = await mysql.createConnection(dbConfig);
        const sql = 'INSERT INTO students (id, name, gender, school, grade, student_class) VALUES (?, ?, ?, ?, ?, ?)';
        await connection.execute(sql, [id, name, gender, school, grade, student_class]);
        await connection.end();
        res.json({ status: "success", message: "新增成功！" });
    } catch (error) {
        console.error("Insert student error:", error);
        res.status(500).json({ status: "error", error: error.message });
    }
});

// 7. API - 修改學生資料
app.put('/api/students/:id', async (req, res) => {
    const { name, gender, school, grade } = req.body;
    const student_class = getClassValue(req.body);
    try {
        const connection = await mysql.createConnection(dbConfig);
        const sql = 'UPDATE students SET name = ?, gender = ?, school = ?, grade = ?, student_class = ? WHERE id = ?';
        const [result] = await connection.execute(sql, [name, gender, school, grade, student_class, req.params.id]);
        await connection.end();
        if (result.affectedRows === 0) {
            res.status(404).json({ status: "error", error: "找不到該學員" });
            return;
        }
        res.json({ status: "success", message: "修改成功！" });
    } catch (error) {
        console.error("Update student error:", error);
        res.status(500).json({ status: "error", error: error.message });
    }
});

// 本地開發埠號
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;