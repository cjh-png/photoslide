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
    const folderId = configSnap.exists() ? configSnap.data().folderId : '19PLjnaiNjxViMFKubKEgTsiVxyJwgvaT';

    // 2. 驗證 Google 權限
    if (!process.env.GOOGLE_SERVICE_KEY) {
      throw new Error('Missing GOOGLE_SERVICE_KEY in environment variables');
    }

    // --- 關鍵修復區塊 ---
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_KEY);
    
    // 如果私鑰包含文字版的 "\n"，強制轉換為真正的換行符號
    // 這行程式碼專門解決 ERR_OSSL_UNSUPPORTED 錯誤
    if (credentials.private_key) {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }
    // ------------------

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    const drive = google.drive({ version: 'v3', auth });

    // 3. 定義遞歸函數來抓取所有子資料夾的圖片
    let allImages = [];

    async function fetchFiles(currentFolderId) {
      const query = `'${currentFolderId}' in parents and (mimeType contains 'image/' or mimeType = 'application/vnd.google-apps.folder') and trashed = false`;
      
      const response = await drive.files.list({
        q: query,
        fields: 'files(id, name, mimeType, webContentLink, webViewLink)',
        pageSize: 1000, 
      });

      const files = response.data.files || [];
      const imageFiles = [];
      const subFolders = [];

      files.forEach(file => {
        if (file.mimeType === 'application/vnd.google-apps.folder') {
          subFolders.push(file);
        } else {
          imageFiles.push({
            id: file.id,
// 強制使用 Google Drive 的直接預覽連結格式
            url: `https://lh3.googleusercontent.com/d/${file.id}`
          });
        }
      });

      allImages = [...allImages, ...imageFiles];

      if (subFolders.length > 0) {
        await Promise.all(subFolders.map(folder => fetchFiles(folder.id)));
      }
    }

    await fetchFiles(folderId);

    res.status(200).json({ images: allImages });

  } catch (error) {
    console.error("API Error:", error);
    // 這裡會把詳細錯誤印在終端機，方便除錯
    res.status(500).json({ error: error.message, details: error.stack });
  }
}