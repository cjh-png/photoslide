// pages/index.js
import { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay, EffectFade } from 'swiper/modules';

// 引入 Swiper 樣式
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

export default function Home() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 呼叫後端 API 抓圖片
    fetch('/api/getImages')
      .then(res => res.json())
      .then(data => {
        if (data.images) setImages(data.images);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="h-screen w-full bg-black text-white flex justify-center items-center">載入圖片中...</div>;
  }

  return (
    <div className="h-screen w-full bg-black relative">
      <h1 className="absolute top-4 left-4 z-20 text-white/50 text-sm select-none">Drive Gallery</h1>

      {images.length === 0 ? (
        <div className="flex h-full items-center justify-center text-white">
          資料夾內沒有圖片，請檢查後台設定或權限。
        </div>
      ) : (
        <Swiper
          modules={[Navigation, Pagination, Autoplay, EffectFade]}
          effect="fade"
          spaceBetween={0}
          slidesPerView={1}
          navigation
          pagination={{ clickable: true }}
          loop={true}
          autoplay={{ delay: 4000, disableOnInteraction: false }}
          className="w-full h-full"
        >
          {images.map((img) => (
            <SwiperSlide key={img.id} className="relative w-full h-full">
              <div className="flex w-full h-full items-center justify-center bg-black">
                <img 
                  src={img.url} 
                  alt="Slide" 
                  referrerPolicy="no-referrer"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      )}
    </div>
  );
}