// pages/api/getImages.js
import { google } from 'googleapis';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const configRef = doc(db, "settings", "config");
    const configSnap = await getDoc(configRef);
    const folderId = configSnap.exists() ? configSnap.data().folderId : '';

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

    // 1. 先抓根目錄的名字
    let rootFolderName = "";
    if (folderId) {
      try {
        const folderMeta = await drive.files.get({
          fileId: folderId,
          fields: 'name',
        });
        rootFolderName = folderMeta.data.name;
      } catch (e) {
        console.error("無法讀取資料夾名稱", e);
        rootFolderName = "相簿";
      }
    }

    let allImages = [];

    // 2. 修改遞歸函數，多接收一個 currentFolderName 參數
    async function fetchFiles(currentFolderId, currentFolderName) {
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
          // 如果是資料夾，把它存起來，稍後遞歸處理
          subFolders.push(file);
        } else {
          // ★★★ 關鍵修改：把目前的資料夾名稱 (currentFolderName) 寫入圖片物件
          allImages.push({
            id: file.id,
            url: `https://lh3.googleusercontent.com/d/${file.id}`, // 修正為標準 HTTPS lh3 連結
            folderName: currentFolderName // 這裡記錄這張照片屬於哪個資料夾
          });
        }
      });

      // 遞歸處理子資料夾，把子資料夾的名字 (folder.name) 傳下去
      if (subFolders.length > 0) {
        await Promise.all(subFolders.map(folder => fetchFiles(folder.id, folder.name)));
      }
    }

    // 開始抓取，初始傳入根目錄 ID 和 根目錄名字
    await fetchFiles(folderId, rootFolderName);

    // 這裡只需要回傳圖片陣列，因為圖片裡面已經包含 folderName 了
    res.status(200).json({ 
      images: allImages 
    });

  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: error.message });
  }
}
