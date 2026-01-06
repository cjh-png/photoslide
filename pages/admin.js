// pages/admin.js
import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';

export default function Admin() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // 設定狀態
  const [folderId, setFolderId] = useState('');
  const [mainTitle, setMainTitle] = useState(''); // 新增：大標題
  const [subTitle, setSubTitle] = useState('');   // 新增：中標題
  const [effectType, setEffectType] = useState('fade'); // 新增：特效
  
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // 定義特效選項
  const effects = [
    { id: 'slide', name: '無特效 (普通滑動 + 圓點)' },
    { id: 'fade', name: '淡入淡出 (Fade)' },
    { id: 'cube', name: '3D 方塊 (Cube)' },
    { id: 'coverflow', name: '3D 唱片流 (Coverflow)' },
    { id: 'cards', name: '卡片堆疊 (Cards)' },
    { id: 'creative', name: '電影運鏡 (Creative)' },
    { id: 'random', name: '🎲 每10張隨機切換' },
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) fetchCurrentConfig();
    });
    return () => unsubscribe();
  }, []);

  const fetchCurrentConfig = async () => {
    try {
      const configRef = doc(db, "settings", "config");
      const snap = await getDoc(configRef);
      if (snap.exists()) {
        const data = snap.data();
        setFolderId(data.folderId || '');
        setMainTitle(data.mainTitle || '慈雲山天主教小學');
        setSubTitle(data.subTitle || '日期 = 活動名稱');
        setEffectType(data.effectType || 'fade');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setMsg('登入失敗：' + err.message);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setMsg('');
    try {
      // 處理網址，只留 ID
      let cleanId = folderId.trim();
      if (cleanId.includes('folders/')) {
        cleanId = cleanId.split('folders/')[1].split('?')[0]; 
      }

      await setDoc(doc(db, "settings", "config"), { 
        folderId: cleanId,
        mainTitle,
        subTitle,
        effectType
      });
      
      setFolderId(cleanId);
      setMsg('✅ 設定已更新！前台重新整理即可看到效果。');
    } catch (err) {
      setMsg('❌ 儲存失敗：' + err.message);
    }
    setLoading(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded shadow-md w-80 space-y-4">
          <h2 className="text-xl font-bold text-center">後台登入</h2>
          <input type="email" placeholder="Email" className="w-full p-2 border rounded" value={email} onChange={e => setEmail(e.target.value)} />
          <input type="password" placeholder="Password" className="w-full p-2 border rounded" value={password} onChange={e => setPassword(e.target.value)} />
          <button className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">登入</button>
          {msg && <p className="text-red-500 text-sm text-center">{msg}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-lg">
        <div className="flex justify-between items-center border-b pb-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-800">相簿輪播控制台</h1>
          <button onClick={() => signOut(auth)} className="text-red-500 hover:underline">登出</button>
        </div>

        <div className="space-y-6">
          {/* 資料夾設定 */}
          <div>
            <label className="block text-gray-700 font-bold mb-2">Google Drive 資料夾 ID</label>
            <input 
              type="text" value={folderId} onChange={(e) => setFolderId(e.target.value)}
              className="w-full p-3 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* 標題設定 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-bold mb-2">大標題 (學校名稱)</label>
              <input 
                type="text" value={mainTitle} onChange={(e) => setMainTitle(e.target.value)}
                className="w-full p-3 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-2">中標題 (日期=活動)</label>
              <input 
                type="text" value={subTitle} onChange={(e) => setSubTitle(e.target.value)}
                className="w-full p-3 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* 特效選擇 */}
          <div>
            <label className="block text-gray-700 font-bold mb-3">輪播切換特效</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {effects.map((eff) => (
                <button
                  key={eff.id}
                  onClick={() => setEffectType(eff.id)}
                  className={`p-3 rounded border text-sm font-medium transition-all ${
                    effectType === eff.id 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105' 
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {eff.name}
                </button>
              ))}
            </div>
          </div>

          {/* 儲存按鈕 */}
          <button 
            onClick={handleSave} disabled={loading}
            className={`w-full py-4 rounded-lg text-white font-bold text-lg shadow-md transition ${
              loading ? 'bg-gray-400' : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
            }`}
          >
            {loading ? '儲存中...' : '儲存所有設定'}
          </button>

          {msg && (
            <div className={`p-4 rounded text-center font-medium ${msg.includes('成功') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {msg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
