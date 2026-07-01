const fs = require('fs');
const fetch = require('node-fetch');

const BASE_URL = "https://dvnb.zilcode.vn/api/"; // Thay bằng URL thật của bạn
const TOKEN = "eyJhbGciOiJodHRwOi8vd3d3LnczLm9yZy8yMDAxLzA0L3htbGRzaWctbW9yZSNobWFjLXNoYTI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1lIjoiMyIsIm5iZiI6MTc4MjkxNTMzNiwiZXhwIjoxNzgzMDAxNzM2fQ.drl_9PtQTJXukIm9_tEOn0bp7VZan2HuIPE85vkYsMg"; // Điền Token JWT của bạn
const TELEGRAM_BOT_TOKEN = "8915363906:AAGeUYl4Rv5Q2-4FckTHgqD3ju18UtCTd1c"; 
const TELEGRAM_CHAT_ID = "@dvnb_thongbao"; // Hoặc ID tài khoản cá nhân

// File tạm để lưu danh sách ID đã gửi nhằm tránh trùng lặp
const DB_FILE = 'sent_ids.json';

async function checkAndNotify() {
    try {
        // 1. Lấy dữ liệu phế đùn
        const url = `${BASE_URL}test_ctphedun?limit=100`;
        const response = await fetch(url, {
            headers: { "Authorization": `Bearer ${TOKEN}`, "Content-Type": "application/json" }
        });
        const data = await response.json();
        if (!data.success) return;

        const listPhe = data.result || [];
        
        // 2. Đọc lịch sử các ID đã gửi tin nhắn trước đó
        let sentIds = [];
        if (fs.existsSync(DB_FILE)) {
            sentIds = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        }

        // 3. Lọc ra các dòng mới chưa từng gửi
        // Giả sử mỗi dòng có trường định danh duy nhất là 'ctphedunid' hoặc tự tạo từ ngày_khối-lượng
        const newRecords = listPhe.filter(item => !sentIds.includes(item.ctphedunid));

        for (const record of newRecords) {
            // Nội dung tin nhắn định dạng Markdown
            const message = `🚨 *THÔNG BÁO PHẾ SẢN XUẤT* 🚨\n\n` +
                            `📅 *Thời gian:* ${record.ngay || 'Chưa rõ'} - Ca: ${record.ca || 'Chưa rõ'}\n` +
                            `📟 *Tổ máy:* ${record.tomay || 'Chưa rõ'}\n` +
                            `⚖️ *Khối lượng phế:* ${record.klphe || 0} kg\n` +
                            `❓ *Nguyên nhân:* ${record.nguyennhan || 'Không rõ'}`;

            // Gửi qua Telegram
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: message,
                    parse_mode: 'Markdown'
                })
            });

            // Lưu ID lại vào danh sách đã gửi
            sentIds.push(record.ctphedunid);
        }

        // Giới hạn file lưu trữ khoảng 500 ID gần nhất để tránh nặng file
        if (sentIds.length > 500) sentIds = sentIds.slice(-500);
        fs.writeFileSync(DB_FILE, JSON.stringify(sentIds));

    } catch (error) {
        console.error("Lỗi thực thi:", error);
    }
}

checkAndNotify();
