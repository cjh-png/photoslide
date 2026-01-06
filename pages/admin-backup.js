
// pages/admin.js
import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';

export default function Admin() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [folderId, setFolderId] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // 1. 監聽使用者登入狀態
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // 如果已登入，就去讀取目前的設定
        fetchCurrentConfig();
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. 讀取 Firestore 中的目前資料夾 ID
  const fetchCurrentConfig = async () => {
    try {
      const configRef = doc(db, "settings", "config");
      const snap = await getDoc(configRef);
      if (snap.exists()) {
        setFolderId(snap.data().folderId);
      } else {
        // 如果還沒有設定，先顯示預設值
        setFolderId('還未設定 (目前使用程式碼預設值)');
      }
    } catch (err) {
      console.error("讀取設定失敗", err);
      setMsg("讀取設定失敗，請檢查 Firestore 權限");
    }
  };

  // 3. 處理登入
  const handleLogin = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setMsg('登入失敗：' + err.message);
    }
  };

  // 4. 處理儲存/更新 ID
  const handleSave = async () => {
    if (!folderId) return;
    setLoading(true);
    setMsg('');

    try {
      // 自動處理：如果使用者貼上的是「完整網址」，我們幫他抓出 ID
      let cleanId = folderId.trim();
      
      // 邏輯：尋找 "folders/" 後面的那一串
      if (cleanId.includes('folders/')) {
        const parts = cleanId.split('folders/');
        if (parts[1]) {
          // 排除問號後面的參數 (例如 ?usp=sharing)
          cleanId = parts[1].split('?')[0]; 
        }
      }

      // 寫入 Firestore
      await setDoc(doc(db, "settings", "config"), { folderId: cleanId });
      
      setFolderId(cleanId); // 更新輸入框顯示清洗後的 ID
      setMsg('✅ 更新成功！請回到首頁重新整理查看新相簿。');
    } catch (err) {
      console.error(err);
      setMsg('❌ 儲存失敗：' + err.message);
    }
    setLoading(false);
  };

  // --- 畫面渲染區域 ---

  // A. 如果沒登入，顯示登入框
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded shadow-md w-80 space-y-4">
          <h2 className="text-xl font-bold text-center">後台登入</h2>
          <input 
            type="email" 
            placeholder="管理員 Email" 
            className="w-full p-2 border rounded"
            value={email} onChange={e => setEmail(e.target.value)}
          />
          <input 
            type="password" 
            placeholder="密碼" 
            className="w-full p-2 border rounded"
            value={password} onChange={e => setPassword(e.target.value)}
          />
          <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
            登入
          </button>
          {msg && <p className="text-red-500 text-sm text-center">{msg}</p>}
        </form>
      </div>
    );
  }

  // B. 如果已登入，顯示設定面板
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-xl mx-auto bg-white p-6 rounded shadow">
        <div className="flex justify-between items-center border-b pb-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-800">相簿連結設定</h1>
          <button 
            onClick={() => signOut(auth)} 
            className="text-sm text-red-500 hover:underline"
          >
            登出
          </button>
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2">
            Google Drive 資料夾連結 (或 ID)
          </label>
          <input 
            type="text" 
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="例如: https://drive.google.com/..."
          />
          <p className="text-gray-400 text-xs mt-2">
            提示：你可以直接貼上完整網址，系統會自動擷取 ID。請確保該資料夾已開啟「知道連結的任何人」權限。
          </p>
        </div>

        <button 
          onClick={handleSave}
          disabled={loading}
          className={`w-full py-3 rounded text-white font-bold transition ${
            loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {loading ? '儲存中...' : '儲存變更'}
        </button>

        {msg && (
          <div className={`mt-4 p-3 rounded text-center ${msg.includes('成功') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}
