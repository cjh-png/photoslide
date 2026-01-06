// pages/index.js
import { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay, EffectFade, EffectCube, EffectCoverflow, EffectCards, EffectCreative } from 'swiper/modules';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

// 引入樣式
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
  
  // 設定狀態
  const [dynamicSubtitle, setDynamicSubtitle] = useState(''); 
  const [config, setConfig] = useState({
    mainTitle: '',
    subTitle: '',
    effectType: 'slide'
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
    if (config.effectType === 'random') {
      if (swiper.realIndex > 0 && swiper.realIndex % 10 === 0) {
        const nextEffect = effectList[Math.floor(Math.random() * effectList.length)];
        setCurrentEffect(nextEffect);
      }
    }
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
          
          // ★ 這裡設定顯示 10 個主要圓點
          pagination={{ 
            clickable: true, 
            dynamicBullets: true, 
            dynamicMainBullets: 20 
          }}

          cubeEffect={{ shadow: true, slideShadows: true, shadowOffset: 20, shadowScale: 0.94 }}
          coverflowEffect={{ rotate: 50, stretch: 0, depth: 100, modifier: 1, slideShadows: true }}
          cardsEffect={{ slideShadows: true }}
          creativeEffect={{
            prev: { shadow: true, translate: [0, 0, -400] },
            next: { translate: ['100%', 0, 0] },
          }}
          
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
        /* 1. 容器設定：絕對定位 + 水平居中 */
        .swiper-pagination {
          position: absolute !important;
          bottom: 25px !important;
          left: 0 !important;
          width: 100% !important; /* 佔滿寬度 */
          z-index: 50 !important;
          pointer-events: auto;
          display: flex !important; /* 啟用 Flex 佈局 */
          justify-content: center !important; /* ★★★ 關鍵：讓圓點在中間 ★★★ */
        }

        /* 2. 圓點樣式：改為黃色 */
        .swiper-pagination-bullet {
          background: #fbbf24 !important; /* ★★★ 改成黃色 (原本是 white) ★★★ */
          opacity: 0.4; /* 未選中時半透明 */
          width: 10px;  
          height: 10px;
          margin: 0 4px !important;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px rgba(0,0,0,0.5); /* 陰影保留，增加對比度 */
        }
        
        /* 3. 選中時的樣式 */
        .swiper-pagination-bullet-active {
          opacity: 1; /* 選中時不透明 */
          background: #fbbf24 !important; /* 確保選中也是黃色 */
          transform: scale(1.2); 
        }
        
        /* 動畫樣式保持不變 */
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
