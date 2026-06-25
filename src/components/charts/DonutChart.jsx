import Svg, { G, Path } from 'react-native-svg';

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeDonutArc(cx, cy, outerR, innerR, startAngle, endAngle) {
  const isFull = endAngle - startAngle >= 359.999;
  if (isFull) {
    return [
      `M ${cx} ${cy - outerR}`,
      `A ${outerR} ${outerR} 0 1 0 ${cx} ${cy + outerR}`,
      `A ${outerR} ${outerR} 0 1 0 ${cx} ${cy - outerR}`,
      `M ${cx} ${cy - innerR}`,
      `A ${innerR} ${innerR} 0 1 1 ${cx} ${cy + innerR}`,
      `A ${innerR} ${innerR} 0 1 1 ${cx} ${cy - innerR}`,
      'Z',
    ].join(' ');
  }
  const startOuter = polarToCartesian(cx, cy, outerR, endAngle);
  const endOuter = polarToCartesian(cx, cy, outerR, startAngle);
  const startInner = polarToCartesian(cx, cy, innerR, startAngle);
  const endInner = polarToCartesian(cx, cy, innerR, endAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerR} ${outerR} 0 ${large} 0 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${innerR} ${innerR} 0 ${large} 1 ${endInner.x} ${endInner.y}`,
    'Z',
  ].join(' ');
}

export default function DonutChart({ data, size = 120, innerRadius = 38 }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 1;

  const slices = data.reduce((acc, d) => {
    const prevAngle = acc.length > 0 ? acc[acc.length - 1].endAngle : 0;
    const sliceAngle = (d.value / total) * 360;
    acc.push({ startAngle: prevAngle, endAngle: prevAngle + sliceAngle, color: d.color });
    return acc;
  }, []);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <G>
        {slices.map((s, i) => (
          <Path
            key={i}
            d={describeDonutArc(cx, cy, outerR, innerRadius, s.startAngle, s.endAngle)}
            fill={s.color}
          />
        ))}
      </G>
    </Svg>
  );
}
