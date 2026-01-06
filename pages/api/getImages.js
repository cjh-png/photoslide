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
    const folderId = configSnap.exists() ? configSnap.data().folderId : ''; 

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

    // --- 【新增功能】獲取資料夾名稱 ---
    let folderName = "";
    if (folderId) {
        try {
        const folderMeta = await drive.files.get({
            fileId: folderId,
            fields: 'name', // 只抓名字就好
        });
        folderName = folderMeta.data.name;
        } catch (e) {
        console.error("無法讀取資料夾名稱", e);
        folderName = "相簿";
        }
    }
    // -------------------------------------

    // 3. 抓取圖片邏輯
    let allImages = [];

    async function fetchFiles(currentFolderId) {
      if (!currentFolderId) return;

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
          // 【修正重點】這裡修復了語法錯誤，並使用 HTTPS
          allImages.push({
            id: file.id,
            // 注意這裡多了 $ 符號，且網址改為標準 lh3 格式
            url: `https://lh3.googleusercontent.com/d/${file.id}` 
          });
        }
      });

      if (subFolders.length > 0) {
        await Promise.all(subFolders.map(folder => fetchFiles(folder.id)));
      }
    }

    await fetchFiles(folderId);

    // 回傳資料
    res.status(200).json({ 
      images: allImages,
      folderName: folderName // 回傳資料夾名稱
    });

  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: error.message });
  }
}
