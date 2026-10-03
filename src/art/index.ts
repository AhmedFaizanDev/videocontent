/**
 * Art registry: name → factory. Generic diagrams first; domain packs add hand-drawn arts.
 * To add a pack: write src/art/packs/<name>.tsx (see endoscopy.tsx), spread it in here, and
 * describe its anchors in src/art/catalog.ts so specs are validated against it.
 */
import type {ArtFactory} from './kit';
import {DIAGRAMS} from './diagrams';
import {ENDOSCOPY} from './packs/endoscopy';
import {GRAPH} from './graph';
import {TABLE} from './table';
import {STAT} from './stat';
import {HEART} from './packs/heart';
import {CIRCULATION} from './packs/circulation';
import {METABOLIC} from './packs/metabolic';
import {RESPIRATORY} from './packs/respiratory';
import {INFECTION} from './packs/infection';
import {BODY} from './packs/body';
import {GENERATED_ARTS} from './packs.gen';
import {VECTOR_ASSETS} from './vector/index.gen';
import {vectorArt, type VectorAsset, type VectorManifest} from './vector';

/** imported vector assets (scripts/ingest-art.mts), animated from their manifests */
const VECTOR_ARTS: Record<string, ArtFactory> = Object.fromEntries(Object.values(VECTOR_ASSETS).map((v) => [v.manifest.key, vectorArt(v.asset as VectorAsset, v.manifest as unknown as VectorManifest)]));

export const ARTS: Record<string, ArtFactory> = {...DIAGRAMS, ...GRAPH, ...TABLE, ...STAT, ...ENDOSCOPY, ...HEART, ...CIRCULATION, ...METABOLIC, ...RESPIRATORY, ...INFECTION, ...BODY, ...GENERATED_ARTS, ...VECTOR_ARTS};
export {ArtView, type ArtDef} from './kit';
export {CATALOG, calloutsFor} from './catalog';
