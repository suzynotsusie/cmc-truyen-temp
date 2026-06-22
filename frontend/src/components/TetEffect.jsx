import { useEffect, useRef } from 'react';

function TetEffect({ enabled }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const maxPetals = 35; // Số lượng cánh hoa trên màn hình
    const petals = [];

    // Định nghĩa lớp Cánh Hoa Anh Đào (Sakura Petal)
    class Petal {
      constructor() {
        this.reset();
        // Rải ngẫu nhiên tọa độ Y ban đầu để hoa xuất hiện rải rác toàn màn hình ngay khi bật
        this.y = Math.random() * canvas.height;
      }

      reset() {
        this.x = Math.random() * canvas.width;
        this.y = -20;
        this.width = Math.random() * 6 + 8;   // Độ rộng cánh hoa (8px đến 14px)
        this.height = Math.random() * 4 + 6;  // Chiều cao cánh hoa
        
        // VẬT LÝ DI TRUYỂN DỊU DÀNG:
        this.speedY = Math.random() * 2 + 0.6; // Tốc độ rơi cực kỳ chậm rãi
        this.speedX = Math.random() * 0.4 + 0.2; // Xu hướng bị gió thổi nhẹ sang bên phải

        // THUẬT TOÁN LẮC LƯ HÌNH SIN:
        this.swayAmplitude = Math.random() * 1 + 0.5; // Độ uốn lượn rộng hay hẹp
        this.swaySpeed = Math.random() * 0.02 + 0.01;   // Tốc độ lượn sóng
        this.swayAngle = Math.random() * Math.PI * 2;   // Góc bắt đầu lượn
        
        // BẢNG MÀU HỒNG PASTEL
        const colors = [
          'rgba(255, 183, 197, 0.85)', 
          'rgba(255, 192, 203, 0.75)', 
          'rgba(244, 154, 193, 0.8)',  
          'rgba(255, 218, 224, 0.65)'  
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
        
        // Góc tự xoay quanh tâm của cánh hoa
        this.rotation = Math.random() * Math.PI;
        this.rotationSpeed = Math.random() * 0.015 - 0.007;
      }

      update() {
        this.y += this.speedY;
        
        // Tạo quỹ đạo zic-zac mềm mại bằng cách cộng hàm Sin vào tọa độ X
        this.swayAngle += this.swaySpeed;
        this.x += this.speedX + Math.sin(this.swayAngle) * this.swayAmplitude;
        
        this.rotation += this.rotationSpeed;

        // Nếu cánh hoa bay ra ngoài rìa hoặc rơi quá đáy, hồi sinh lại trên đỉnh
        if (this.y > canvas.height + 20 || this.x > canvas.width + 20 || this.x < -20) {
          this.reset();
        }
      }

      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        ctx.beginPath();
        ctx.ellipse(0, 0, this.width, this.height, 0, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        
        ctx.restore();
      }
    }

    // TỐI ƯU/SỬA LỖI TẠI ĐÂY: Khởi tạo mảng hoa trực tiếp, chuẩn xác không qua check biến rác
    for (let i = 0; i < maxPetals; i++) {
      petals.push(new Petal());
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      petals.forEach((petal) => {
        petal.update();
        petal.draw();
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  );
}

export default TetEffect;