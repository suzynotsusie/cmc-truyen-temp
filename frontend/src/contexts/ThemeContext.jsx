import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const ThemeContext = createContext(null);

/**
 * 🧧 HÀM HELPER: Kiểm tra xem thời gian hiện tại có phải dịp Tết không
 * Logic siêu đơn giản: Tập trung quanh ngày mốc 29/1.
 * Cụ thể: Bật từ 27/1 đến hết 31/1 Dương lịch.
 */
const checkIsTetSeason = () => {
  try {
    const now = new Date();
    const month = now.getMonth() + 1; // getMonth() chạy từ 0-11 nên phải cộng 1
    const day = now.getDate();

    // Điều kiện: Tháng 1 và ngày lớn hơn hoặc bằng 27 VÀ nhỏ hơn hoặc bằng 31
    return month === 1 && day >= 27 && day <= 31;
  } catch {
    // Phòng trường hợp lỗi hệ thống thời gian của máy khách, trả về false để tránh crash
    return false;
  }
};

function ThemeProvider({ children }) {
  // -------------------------------------------------------------
  // STATE 1: Giao diện Sáng/Tối (Dark Mode)
  // -------------------------------------------------------------
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      return localStorage.getItem('cmc_theme') === 'dark';
    } catch {
      return false;
    }
  });

  // -------------------------------------------------------------
  // STATE 2: Hình nền tùy chỉnh (Background Image)
  // -------------------------------------------------------------
  const [backgroundImage, setBackgroundImage] = useState(() => {
    try {
      return localStorage.getItem('cmc_background_image') || '';
    } catch {
      return '';
    }
  });

  // -------------------------------------------------------------
  // STATE 3: Hiệu ứng tuyết rơi (Christmas/Winter Snow)
  // -------------------------------------------------------------
  const [isSnowEnabled, setIsSnowEnabled] = useState(() => {
    try {
      return localStorage.getItem('cmc_snow_enabled') !== 'false';
    } catch {
      return true;
    }
  });

  // -------------------------------------------------------------
  // 🧧 STATE 4: Hiệu ứng Tết (Lì xì & Đồng xu) - MỚI THÊM
  // -------------------------------------------------------------
  const [isTetEffectEnabled, setIsTetEffectEnabled] = useState(() => {
    try {
      // Bước A: Kiểm tra xem người dùng đã từng bấm Tắt/Bật thủ công chưa
      const saved = localStorage.getItem('cmc_tet_enabled');
      
      // Bước B: Nếu đã có lịch sử lưu, dùng giá trị người dùng chọn (true hoặc false)
      if (saved !== null) return saved === 'true';
      
      // Bước C: Nếu là lần đầu tiên vào trang, tự động chạy hàm kiểm tra ngày 29/1
      return checkIsTetSeason();
    } catch {
      return false;
    }
  });

  // -------------------------------------------------------------
  // CÁC HÀM TOGGLE (CHUYỂN ĐỔI TRẠNG THÁI) SUY PHỤC TỪ CALLBACK
  // -------------------------------------------------------------
  
  // Hàm tắt/bật Tuyết rơi
  const toggleSnow = useCallback(() => {
    setIsSnowEnabled((prev) => {
      const newState = !prev;
      try {
        localStorage.setItem('cmc_snow_enabled', newState ? 'true' : 'false');
      } catch {
        // Bỏ qua nếu bộ nhớ localStorage bị lỗi hoặc bị chặn
      }
      return newState;
    });
  }, []);

  // 🧧 Hàm tắt/bật Hiệu ứng Tết - MỚI THÊM
  // Sử dụng useCallback để hàm không bị khởi tạo lại vô ích khi Re-render
  const toggleTetEffect = useCallback(() => {
    setIsTetEffectEnabled((prev) => {
      const newState = !prev;
      try {
        // Lưu lại lựa chọn của người dùng vào localStorage dưới dạng chuỗi 'true' hoặc 'false'
        localStorage.setItem('cmc_tet_enabled', newState ? 'true' : 'false');
      } catch {
        // Bỏ qua lỗi hạn ngạch lưu trữ
      }
      return newState;
    });
  }, []);

  // -------------------------------------------------------------
  // ĐỒNG BỘ DARK MODE VỚI SERVER & HỆ THỐNG (Listeners)
  // -------------------------------------------------------------
  const darkModeListenersRef = useRef(new Set());

  const registerDarkModeListener = useCallback((fn) => {
    darkModeListenersRef.current.add(fn);
    return () => darkModeListenersRef.current.delete(fn);
  }, []);

  // Effect cập nhật class và attribute lên thẻ <html> / <body> khi Dark mode thay đổi
  useEffect(() => {
    const theme = isDarkMode ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', isDarkMode);
    document.body.classList.toggle('dark-mode', isDarkMode);
    try {
      localStorage.setItem('cmc_theme', theme);
    } catch {
      // Ignore
    }

    darkModeListenersRef.current.forEach((fn) => fn(isDarkMode));
  }, [isDarkMode]);

  // Effect áp dụng ảnh nền tùy chỉnh lên CSS toàn trang
  useEffect(() => {
    if (backgroundImage) {
      document.documentElement.style.setProperty('--custom-background-image', `url(${backgroundImage})`);
      document.body.classList.add('has-custom-background');
      try {
        localStorage.setItem('cmc_background_image', backgroundImage);
      } catch {
        // Khắc phục lỗi tràn dung lượng bộ nhớ đối với ảnh quá lớn
      }
      return;
    }

    document.documentElement.style.removeProperty('--custom-background-image');
    document.body.classList.remove('has-custom-background');
    try {
      localStorage.removeItem('cmc_background_image');
    } catch {
      // Ignore
    }
  }, [backgroundImage]);

  // -------------------------------------------------------------
  // ĐÓNG GÓI DỮ LIỆU (VALUING & MEMOIZATION)
  // -------------------------------------------------------------
  const value = useMemo(
    () => ({
      isDarkMode,
      setIsDarkMode,
      toggleDarkMode: () => setIsDarkMode((v) => !v),
      backgroundImage,
      setBackgroundImage,
      clearBackgroundImage: () => setBackgroundImage(''),
      registerDarkModeListener,
      isSnowEnabled,
      toggleSnow,
      
      // 🧧 Đổ dữ liệu Tết vào đây để chia sẻ cho Navbar và SettingsModal dùng chung
      isTetEffectEnabled, 
      toggleTetEffect,     
    }),
    [
      isDarkMode, 
      backgroundImage, 
      registerDarkModeListener, 
      isSnowEnabled, 
      toggleSnow, 
      
      // Đừng quên thêm 2 biến này vào mảng dependencies của useMemo
      isTetEffectEnabled, 
      toggleTetEffect
    ]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// Custom Hook tiện ích để lấy nhanh dữ liệu Theme ở mọi Component con
function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

export { ThemeProvider, useTheme };