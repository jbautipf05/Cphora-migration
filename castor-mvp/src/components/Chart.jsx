import { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  LineController,
  BarController,
  DoughnutController,
  PieController,
  LineElement,
  BarElement,
  ArcElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  LineController,
  BarController,
  DoughnutController,
  PieController,
  LineElement,
  BarElement,
  ArcElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
);

// Estilo por defecto coherente con el tema oscuro del demo.
ChartJS.defaults.color = '#8A9BB8';
ChartJS.defaults.borderColor = 'rgba(42,64,97,0.5)';
ChartJS.defaults.font.family = 'Inter, ui-sans-serif, system-ui, sans-serif';

// Wrapper declarativo sobre Chart.js. Recibe {type, data, options}.
export default function Chart({ type, data, options, height = 280 }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return undefined;
    chartRef.current = new ChartJS(canvasRef.current, {
      type,
      data,
      options: { responsive: true, maintainAspectRatio: false, ...options },
    });
    return () => chartRef.current?.destroy();
    // Recrea el gráfico si cambian los datos (suficiente para datos de demo).
  }, [type, JSON.stringify(data), JSON.stringify(options)]);

  return (
    <div className="relative" style={{ height }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
