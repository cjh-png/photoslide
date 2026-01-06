// pages/api/getImages.js
import { google } from 'googleapis';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    // 1. 從 Firebase 讀取 Folder ID
    const configRef = doc(db, "settings", "config");
    const configSnap = await getDoc(configRef);
    const folderId = configSnap.exists() ? configSnap.data().folderId : '你的預設ID'; // 如果沒設定就用預設

    // 2. 驗證 Google 權限
    if (!process.env.GOOGLE_SERVICE_KEY) {
      throw new Error('Missing GOOGLE_SERVICE_KEY');
    }

    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_KEY);
    if (credentials.private_key) {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    const drive = google.drive({ version: 'v3', auth });

    // --- 【修改點 1】新增：獲取資料夾名稱 ---
    let folderName = "";
    try {
      const folderMeta = await drive.files.get({
        fileId: folderId,
        fields: 'name', // 只抓名字就好
      });
      folderName = folderMeta.data.name;
    } catch (e) {
      console.error("無法讀取資料夾名稱", e);
      folderName = "未知相簿";
    }
    // -------------------------------------

    // 3. 抓取圖片邏輯 (保持原本遞歸邏輯)
    let allImages = [];

    async function fetchFiles(currentFolderId) {
      const query = `'${currentFolderId}' in parents and (mimeType contains 'image/' or mimeType = 'application/vnd.google-apps.folder') and trashed = false`;
      
      const response = await drive.files.list({
        q: query,
        fields: 'files(id, name, mimeType)',
        pageSize: 1000, 
      });

      const files = response.data.files || [];
      const subFolders = [];

      files.forEach(file => {
        if (file.mimeType === 'application/vnd.google-apps.folder') {
          subFolders.push(file);
        } else {
          // 使用 lh3 連結
          allImages.push({
            id: file.id,
            url: `https://lh3.googleusercontent.com/d/${file.id}` // 修正為正確的 lh3 格式
          });
        }
      });

      if (subFolders.length > 0) {
        await Promise.all(subFolders.map(folder => fetchFiles(folder.id)));
      }
    }

    await fetchFiles(folderId);

    // --- 【修改點 2】回傳資料中加入 folderName ---
    res.status(200).json({ 
      images: allImages,
      folderName: folderName // 把名字傳給前端
    });

  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: error.message });
  }
}
