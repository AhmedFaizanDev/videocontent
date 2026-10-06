import React from 'react';
import {colors} from '../theme';

/**
 * The "TA" monogram (Talha Affan): a heavy T, a mitred A whose crossbar runs out to
 * the right and terminates in a solid node. Parts are individually animatable
 * (0..1 each) so the outro can assemble the mark; omit `parts` for the static mark.
 */
export type TaParts = {tBar: number; tStem: number; a: number; bar: number; dot: number};
const FULL: TaParts = {tBar: 1, tStem: 1, a: 1, bar: 1, dot: 1};

export const TaMark: React.FC<{
	height?: number;
	color?: string;
	dotColor?: string;
	parts?: TaParts;
}> = ({height = 48, color = '#F6F1E7', dotColor, parts = FULL}) => {
	const W = 272;
	const H = 170;
	const legLen = 172;
	return (
		<svg width={(W / H) * height} height={height} viewBox={`0 0 ${W} ${H}`} fill="none">
			<defs>
				<clipPath id="ta-feet">
					<rect x="0" y="-10" width={W} height={175} />
				</clipPath>
			</defs>
			{/* T: bar draws from the left, stem drops from the bar */}
			<rect x="0" y="23" width={120 * parts.tBar} height="25" fill={color} />
			<rect x="42" y="23" width="24" height={142 * parts.tStem} fill={color} />
			{/* A: one mitred stroke, drawn left foot → apex → right foot */}
			<g clipPath="url(#ta-feet)">
				<path
					d="M102 168 L140 6 L184 168"
					stroke={color}
					strokeWidth="24"
					strokeLinejoin="miter"
					strokeMiterlimit={10}
					strokeDasharray={legLen * 2}
					strokeDashoffset={legLen * 2 * (1 - parts.a)}
				/>
			</g>
			{/* crossbar runs out past the A to the node */}
			<rect x="116" y="103" width={(250 - 116) * parts.bar} height="17" fill={color} />
			<circle cx="252" cy="111.5" r={18 * parts.dot} fill={dotColor ?? color} />
		</svg>
	);
};

/**
 * Faithful recreation of the Talha logo:
 * staircase + breakout arrow forms the "T" letterform, followed by "alha".
 * Steps ascend left-to-right; arrow curves from lower-left out the top-right.
 */
export const TalhaMark: React.FC<{
	height?: number;
	color?: string;
	markOnly?: boolean;
	markColor?: string;
}> = ({height = 48, color = '#1a4f8a', markOnly = false, markColor}) => {
	const mc = markColor ?? color;
	// viewBox: icon ~56px wide, "alha" text ~108px wide
	const iconW = 56;
	const textW = markOnly ? 0 : 116;
	const vbW = iconW + textW;
	const vbH = 72;

	return (
		<svg
			width={(vbW / vbH) * height}
			height={height}
			viewBox={`0 0 ${vbW} ${vbH}`}
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			{/* Three ascending steps (left=short, right=tall), form the T stem */}
			{/* Step 1 — leftmost, shortest */}
			<rect x="2" y="46" width="14" height="22" rx="1" fill={mc} />
			{/* Step 2 — middle */}
			<rect x="20" y="32" width="14" height="36" rx="1" fill={mc} />
			{/* Step 3 — rightmost, tallest */}
			<rect x="38" y="18" width="14" height="50" rx="1" fill={mc} />

			{/* Breakout arrow — curves from bottom-left, exits top-right */}
			<path
				d="M8 60 C10 40 26 20 46 4"
				stroke={mc}
				strokeWidth="5"
				strokeLinecap="round"
				fill="none"
			/>
			{/* Arrowhead */}
			<path
				d="M46 4 L38 10 L52 12 Z"
				fill={mc}
			/>

			{/* "alha" — same blue, sized to match letter height of a capital T */}
			{!markOnly && (
				<text
					x={iconW + 6}
					y="60"
					fontFamily="Arial Black, Arial, sans-serif"
					fontWeight="900"
					fontSize="48"
					fill={color}
					letterSpacing="-1"
				>
					alha
				</text>
			)}
		</svg>
	);
};
