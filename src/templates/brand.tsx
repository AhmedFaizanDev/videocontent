/**
 * Brand layer: the project config travels with every render as a React context, so the
 * few brand-dependent pieces (logo, outro line, episode label, music) never hard-code a
 * brand. Artwork: project.json `brand.art` (default MedSkills, public/brand/). See src/project.ts.
 */
import React from 'react';
import {Img, staticFile} from 'remotion';
import {PROJECT_DEFAULTS, type ProjectConfig} from '../project';
import type {VideoSpec} from '../spec';

export const ProjectCtx = React.createContext<ProjectConfig>({...PROJECT_DEFAULTS, slug: 'default', name: 'default', series: '', output: {dir: 'default'}});
export const useProject = () => React.useContext(ProjectCtx);

/** "EP.10.1" — the spec's `episode`, else the digits of its id. */
export const episodeOf = (spec: VideoSpec) => spec.episode ?? spec.id.replace(/^\D+/, '');

/**
 * The brand's artwork: `lockup` (icon + wordmark) or `icon`, in colour or white (for the
 * gradient grounds). `reveal` 0→1 wipes it on left→right behind a soft edge (outro, poster).
 */
export const Logo: React.FC<{height: number; variant?: 'lockup' | 'icon'; white?: boolean; reveal?: number; style?: React.CSSProperties}> = ({
  height,
  variant = 'lockup',
  white = false,
  reveal = 1,
  style,
}) => {
  const {brand} = useProject();
  const file = variant === 'lockup' ? brand.art.lockup : brand.art.icon;
  const src = white ? file.replace(/\.png$/, '-white.png') : file;
  const w = height * (variant === 'lockup' ? brand.art.lockupAspect : brand.art.iconAspect);
  const edge = Math.max(0, Math.min(1, reveal)) * 120 - 10;
  const mask = reveal < 1 ? `linear-gradient(90deg, #000 ${edge}%, transparent ${edge + 10}%)` : undefined;
  return <Img src={staticFile(src)} style={{height, width: w, display: 'block', WebkitMaskImage: mask, maskImage: mask, ...style}} />;
};
