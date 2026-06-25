import Svg, { Circle, Line, Path, Text as SvgText, G } from 'react-native-svg';
import { useTheme, hexToRgba } from '../../utils/theme';

export default function BarLineChart({
  data,
  height = 140,
  lineColor,
  containerWidth,
}) {
  const { colors } = useTheme();
  if (!data || data.length === 0) return null;

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const sections = 3;
  const padTop = 8;
  const padBottom = 22;
  const padLeft = 28;
  const padRight = 8;
  const chartH = height - padTop - padBottom;

  const autoW = data.length * 30;
  const svgW = containerWidth || Math.max(autoW, 120);
  const spacing = (svgW - padLeft - padRight) / Math.max(data.length - 1, 1);

  const lineC = lineColor || colors.accent.red;

  const points = data.map((d, i) => {
    const barH = (d.value / maxVal) * chartH;
    const x = padLeft + i * spacing;
    const y = padTop + chartH - barH;
    return { x, y, label: d.label, value: d.value };
  });

  const labelStep = data.length <= 6 ? 1 : Math.ceil(data.length / 5);

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  return (
    <Svg width={svgW} height={height} viewBox={`0 0 ${svgW} ${height}`}>
      {Array.from({ length: sections + 1 }, (_, i) => {
        const y = padTop + (chartH / sections) * i;
        const val = maxVal - (maxVal / sections) * i;
        return (
          <G key={`g-${i}`}>
            <Line
              x1={padLeft}
              y1={y}
              x2={svgW - padRight}
              y2={y}
              stroke={hexToRgba(colors.border, 0.3)}
              strokeWidth={0.5}
            />
            <SvgText
              x={padLeft - 4}
              y={y + 3}
              fill={colors.textTertiary}
              fontSize={9}
              fontWeight="500"
              textAnchor="end"
            >
              {val >= 10000 ? `${(val / 10000).toFixed(0)}w` : Math.round(val)}
            </SvgText>
          </G>
        );
      })}
      <Path
        d={linePath}
        stroke={lineC}
        strokeWidth={2}
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map((p, i) => (
        <Circle
          key={`dot-${i}`}
          cx={p.x}
          cy={p.y}
          r={3}
          fill={lineC}
          stroke={colors.background}
          strokeWidth={1.5}
        />
      ))}
      {points.map((p, i) => (
        <SvgText
          key={`lbl-${i}`}
          x={p.x}
          y={padTop + chartH + 14}
          fill={colors.textTertiary}
          fontSize={8}
          fontWeight="500"
          textAnchor="middle"
          opacity={labelStep > 1 && i % labelStep !== 0 ? 0 : 1}
        >
          {p.label}
        </SvgText>
      ))}
    </Svg>
  );
}
