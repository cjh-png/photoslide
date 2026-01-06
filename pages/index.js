// pages/index.js
import { useEffect, useState, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay, EffectFade, EffectCube, EffectCoverflow, EffectCards, EffectCreative } from 'swiper/modules';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

// 引入所有需要的 Swiper 樣式
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';
import 'swiper/css/effect-cube';
import 'swiper/css/effect-coverflow';
import 'swiper/css/effect-cards';
import 'swiper/css/effect-creative';

export default function Home() {
  const [images, setImages] = useState([]);
  
  // 1. 設定狀態
  const [driveFolderName, setDriveFolderName] = useState(''); // 存 Google Drive 資料夾名稱
  const [config, setConfig] = useState({
    mainTitle: '',
    subTitle: '',
    effectType: 'fade'
  });
  
  // 用來控制當前實際使用的特效 (因為 Random 模式會一直變)
  const [currentEffect, setCurrentEffect] = useState('fade');
  const [loading, setLoading] = useState(true);

  // 定義特效清單 (用於隨機切換)
  const effectList = ['fade', 'cube', 'coverflow', 'creative', 'cards'];

  useEffect(() => {
    // 2. 讀取 Firestore 設定
    const fetchConfig = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "config"));
        if (snap.exists()) {
          const data = snap.data();
          setConfig(data);
          
          // 初始化特效
          if (data.effectType === 'random') {
            setCurrentEffect(effectList[0]);
          } else {
            setCurrentEffect(data.effectType || 'fade');
          }
          
          // 3. 呼叫 API 抓圖片 (同時抓取資料夾名稱)
          fetch('/api/getImages') 
            .then(res => res.json())
            .then(imgData => {
              if (imgData.images) setImages(imgData.images);
              
              // 【關鍵】：如果 API 有回傳資料夾名稱，就存起來
              if (imgData.folderName) setDriveFolderName(imgData.folderName);
              
              setLoading(false);
            });
        }
      } catch (err) {
        console.error("Config Error", err);
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  // 處理隨機切換邏輯：每 10 張圖換一次特效
  const handleSlideChange = (swiper) => {
    if (config.effectType === 'random') {
      // realIndex 是當前播放的索引 (0, 1, 2...)
      // 每 10 張切換一次
      if (swiper.realIndex > 0 && swiper.realIndex % 10 === 0) {
        // 隨機選一個新特效
        const nextEffect = effectList[Math.floor(Math.random() * effectList.length)];
        setCurrentEffect(nextEffect);
      }
    }
  };

  if (loading) {
    return <div className="h-screen w-full bg-black flex justify-center items-center text-white text-xl tracking-widest animate-pulse">載入中...</div>;
  }

  return (
    <div className="h-screen w-full bg-black relative overflow-hidden font-sans">
      
      {/* 標題層 */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-20 bg-gradient-to-b from-black/60 via-transparent to-black/80">
        <div className="absolute top-8 left-8 text-white drop-shadow-lg">
          
          <h1 className="text-4xl md:text-5xl font-bold tracking-wider mb-2 animate-slideDown">
            {config.mainTitle || '相簿展示'}
          </h1>

          <div className="flex items-center space-x-3">
             <div className="h-1 w-12 bg-yellow-400 rounded"></div>
             
             {/* 【邏輯判斷】如果 config.subTitle 有值就顯示，否則顯示 Google Drive 資料夾名稱 */}
             <p className="text-xl md:text-2xl font-light text-gray-200 tracking-wide animate-fadeIn">
               {config.subTitle ? config.subTitle : driveFolderName}
             </p>
             
          </div>
        </div>
      </div>

      {/* --- Swiper 輪播層 --- */}
      {images.length === 0 ? (
        <div className="flex h-full items-center justify-center text-white z-30 relative">相簿是空的。</div>
      ) : (
        <Swiper
          // 關鍵：將 key 設為 effect，這樣當 effect 改變時，Swiper 會強制重新渲染，避免 bug
          key={currentEffect} 
          effect={currentEffect}
          grabCursor={true}
          centeredSlides={true}
          slidesPerView={1} // 大部分特效設為 1
          
          // 各種特效的細部參數設定
          cubeEffect={{ shadow: true, slideShadows: true, shadowOffset: 20, shadowScale: 0.94 }}
          coverflowEffect={{ rotate: 50, stretch: 0, depth: 100, modifier: 1, slideShadows: true }}
          cardsEffect={{ slideShadows: true }}
          creativeEffect={{
            prev: { shadow: true, translate: [0, 0, -400] },
            next: { translate: ['100%', 0, 0] },
          }}
          
          modules={[Navigation, Pagination, Autoplay, EffectFade, EffectCube, EffectCoverflow, EffectCards, EffectCreative]}
          
          loop={true}
          autoplay={{ delay: 5000, disableOnInteraction: false }} // 5秒換一張
          speed={1000} // 切換速度 1秒，更平滑
          onSlideChange={handleSlideChange} // 監聽切換
          className="w-full h-full z-10"
        >
          {images.map((img) => (
            <SwiperSlide key={img.id} className="relative w-full h-full bg-black overflow-hidden">
              <div className="w-full h-full flex items-center justify-center relative">
                {/* 1. 增加 ken-burns CSS class 實現緩慢放大效果 
                  2. 增加 box-reflect 實現簡易倒影 (Webkit only)
                */}
                <img 
                  src={img.url} 
                  alt="Slide" 
                  referrerPolicy="no-referrer"
                  className="max-w-full max-h-full object-contain ken-burns"
                  style={{
                    WebkitBoxReflect: 'below 0px linear-gradient(transparent, transparent, #00000040)'
                  }}
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      )}

      {/* --- 全局 CSS 樣式 (定義動畫) --- */}
      <style jsx global>{`
        /* Ken Burns Effect: 圖片緩慢放大 */
        .ken-burns {
          animation: kenBurns 20s ease-out infinite alternate;
          transform-origin: center center;
        }
        @keyframes kenBurns {
          0% { transform: scale(1); }
          100% { transform: scale(1.15); }
        }

        /* 標題進場動畫 */
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-slideDown { animation: slideDown 1s ease-out forwards; }
        .animate-fadeIn { animation: fadeIn 1.5s ease-out forwards; animation-delay: 0.5s; opacity: 0; }
      `}</style>
    </div>
  );
}
