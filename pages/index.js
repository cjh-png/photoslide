// pages/index.js
import { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
// ★ 引入 Pagination 模組
import { Navigation, Pagination, Autoplay, EffectFade, EffectCube, EffectCoverflow, EffectCards, EffectCreative } from 'swiper/modules';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

// 引入所有需要的 Swiper 樣式
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination'; // ★ 記得引入圓點樣式
import 'swiper/css/effect-fade';
import 'swiper/css/effect-cube';
import 'swiper/css/effect-coverflow';
import 'swiper/css/effect-cards';
import 'swiper/css/effect-creative';

export default function Home() {
  const [images, setImages] = useState([]);
  
  // 設定狀態
  const [dynamicSubtitle, setDynamicSubtitle] = useState(''); 
  const [config, setConfig] = useState({
    mainTitle: '',
    subTitle: '',
    effectType: 'slide' // 預設改為 slide
  });
  
  const [currentEffect, setCurrentEffect] = useState('slide');
  const [loading, setLoading] = useState(true);
  const effectList = ['fade', 'cube', 'coverflow', 'creative', 'cards'];

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "config"));
        if (snap.exists()) {
          const data = snap.data();
          setConfig(data);
          
          if (data.effectType === 'random') {
            setCurrentEffect(effectList[0]);
          } else {
            // 如果後台選了 slide，這裡就會設定為 slide
            setCurrentEffect(data.effectType || 'slide');
          }
          
          fetch('/api/getImages') 
            .then(res => res.json())
            .then(imgData => {
              if (imgData.images && imgData.images.length > 0) {
                setImages(imgData.images);
                setDynamicSubtitle(imgData.images[0].folderName);
              }
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

  const handleSlideChange = (swiper) => {
    // 1. 隨機特效邏輯
    if (config.effectType === 'random') {
      if (swiper.realIndex > 0 && swiper.realIndex % 10 === 0) {
        const nextEffect = effectList[Math.floor(Math.random() * effectList.length)];
        setCurrentEffect(nextEffect);
      }
    }

    // 2. 資料夾名稱更新邏輯
    const currentImg = images[swiper.realIndex];
    if (currentImg && currentImg.folderName) {
        setDynamicSubtitle(currentImg.folderName);
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
             <p className="text-xl md:text-2xl font-light text-gray-200 tracking-wide animate-fadeIn">
               {config.subTitle ? config.subTitle : dynamicSubtitle}
             </p>
          </div>
        </div>
      </div>

      {images.length === 0 ? (
        <div className="flex h-full items-center justify-center text-white z-30 relative">相簿是空的。</div>
      ) : (
        <Swiper
          key={currentEffect} 
          effect={currentEffect}
          grabCursor={true}
          centeredSlides={true}
          slidesPerView={1}
          
          // ★★★ 修改這裡：分頁圓點設定 ★★★
          pagination={{ 
            clickable: true, 
            dynamicBullets: true, // 保持動態效果 (讓圓點有大有小)
            dynamicMainBullets: 10 // ★ 設定中間主要顯示 10 顆圓點 (符合你的需求)
          }}

          cubeEffect={{ shadow: true, slideShadows: true, shadowOffset: 20, shadowScale: 0.94 }}
          coverflowEffect={{ rotate: 50, stretch: 0, depth: 100, modifier: 1, slideShadows: true }}
          cardsEffect={{ slideShadows: true }}
          creativeEffect={{
            prev: { shadow: true, translate: [0, 0, -400] },
            next: { translate: ['100%', 0, 0] },
          }}
          
          // ★ 記得把 Pagination 加入 modules
          modules={[Navigation, Pagination, Autoplay, EffectFade, EffectCube, EffectCoverflow, EffectCards, EffectCreative]}
            
            loop={true}
            autoplay={{ delay: 5000, disableOnInteraction: false }} 
            speed={800} 
            onSlideChange={handleSlideChange}
            className="w-full h-full z-10"
          >
          {images.map((img) => (
            <SwiperSlide key={img.id} className="relative w-full h-full bg-black overflow-hidden">
              <div className="w-full h-full flex items-center justify-center relative">
                <img 
                  src={img.url} 
                  alt={img.folderName}
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

    <style jsx global>{`
      /* 絕對定位：讓圓點浮在最下方，不佔據空間 
         這樣無論圓點怎麼變，都不會影響外框大小
      */
      .swiper-pagination {
        position: absolute !important;
        bottom: 30px !important; /* 距離底部的高度 */
        left: 0 !important;
        width: 100% !important;
        z-index: 50 !important;
        pointer-events: auto; /* 確保可以點擊 */
      }
    
      /* 圓點樣式微調 */
      .swiper-pagination-bullet {
        background: white !important;
        opacity: 0.4;
        width: 10px;  /* 圓點稍微大一點方便點擊 */
        height: 10px;
        transition: all 0.3s ease;
      }
    
      .swiper-pagination-bullet-active {
        opacity: 1;
        background: #fbbf24 !important; /* 黃色 */
        transform: scale(1.2); /* 選中時稍微放大 */
      }
      
      /* ... (原本的 ken-burns 等動畫樣式保持不變) ... */
      .ken-burns {
        animation: kenBurns 20s ease-out infinite alternate;
        transform-origin: center center;
      }
      @keyframes kenBurns {
        0% { transform: scale(1); }
        100% { transform: scale(1.15); }
      }
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
