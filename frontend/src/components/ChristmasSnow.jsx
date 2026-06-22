import { useTheme } from '../contexts/ThemeContext';

const SNOWFLAKE_COUNT = 72;

function isChristmasEve(date = new Date()) {
  return date.getMonth() === 5 && date.getDate() === 22;
}

function ChristmasSnow() {
  const { isSnowEnabled } = useTheme(); // Lấy từ context

  // Kiểm tra nếu không được bật thì return null
  if (!isSnowEnabled) return null;

  // Giữ nguyên logic cũ của bạn (isChristmasEve nếu muốn)
  if (!isChristmasEve()) return null;
  return (
    <div className="christmas-snow" aria-hidden="true">
      {Array.from({ length: SNOWFLAKE_COUNT }, (_, index) => {
        const size = 4 + (index % 5) * 2;
        const left = (index * 37) % 100;
        const duration = 9 + (index % 8);
        const delay = -((index * 13) % duration);
        const drift = ((index % 9) - 4) * 8;
        const opacity = 0.45 + (index % 6) * 0.08;

        return (
          <span
            key={index}
            className="christmas-snowflake"
            style={{
              '--snow-size': `${size}px`,
              '--snow-left': `${left}%`,
              '--snow-duration': `${duration}s`,
              '--snow-delay': `${delay}s`,
              '--snow-drift': `${drift}px`,
              '--snow-opacity': opacity,
            }}
          />
        );
      })}
    </div>
  );
}

export default ChristmasSnow;
