import { View } from 'react-native';
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';
import { useTheme, hexToRgba } from '../../utils/theme';

export default function TrendChart({
  data,
  height = 140,
  barWidth = 16,
  barSpacing = 10,
}) {
  const { colors } = useTheme();
  if (!data || data.length === 0) return null;

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const sections = 3;
  const padTop = 8;
  const padBottom = 20;
  const padLeft = 28;
  const padRight = 8;
  const chartH = height - padTop - padBottom;
  const totalW = data.length * (barWidth + barSpacing) - barSpacing + padLeft + padRight;
  const svgW = Math.max(totalW, 120);

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={svgW} height={height} viewBox={`0 0 ${svgW} ${height}`}>
        {Array.from({ length: sections + 1 }, (_, i) => {
          const y = padTop + (chartH / sections) * i;
          const val = maxVal - (maxVal / sections) * i;
          return (
            <G key={`grid-${i}`}>
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
        {data.map((d, i) => {
          const barH = (d.value / maxVal) * chartH;
          const x = padLeft + i * (barWidth + barSpacing);
          const y = padTop + chartH - barH;
          const color = d.frontColor || colors.primary;
          return (
            <G key={`bar-${i}`}>
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barH, 1)}
                rx={4}
                ry={4}
                fill={color}
              />
              <SvgText
                x={x + barWidth / 2}
                y={padTop + chartH + 12}
                fill={colors.textTertiary}
                fontSize={8}
                fontWeight="500"
                textAnchor="middle"
              >
                {d.label}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}
