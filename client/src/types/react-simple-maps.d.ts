declare module "react-simple-maps" {
  import { ReactNode, CSSProperties, MouseEvent } from "react";

  export interface ProjectionConfig {
    scale?: number;
    center?: [number, number];
    rotate?: [number, number, number];
    parallels?: [number, number];
  }

  export interface ComposableMapProps {
    projection?: string;
    projectionConfig?: ProjectionConfig;
    width?: number;
    height?: number;
    style?: CSSProperties;
    className?: string;
    children?: ReactNode;
  }

  export interface ZoomableGroupProps {
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    center?: [number, number];
    translateExtent?: [[number, number], [number, number]];
    onMoveStart?: (pos: { coordinates: [number, number]; zoom: number }, event: MouseEvent) => void;
    onMove?: (pos: { x: number; y: number; zoom: number; dragging: boolean }, event: MouseEvent) => void;
    onMoveEnd?: (pos: { coordinates: [number, number]; zoom: number }, event: MouseEvent) => void;
    children?: ReactNode;
  }

  export interface Geography {
    rsmKey: string;
    id: string | number;
    type: string;
    properties: Record<string, unknown>;
    geometry: { type: string; coordinates: unknown[] };
  }

  export interface GeographiesProps {
    geography: string | Record<string, unknown>;
    children: (props: { geographies: Geography[] }) => ReactNode;
  }

  export interface GeographyStyle {
    default?: CSSProperties;
    hover?: CSSProperties;
    pressed?: CSSProperties;
  }

  export interface GeographyProps {
    geography: Geography;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    style?: GeographyStyle;
    onClick?: (geo: Geography, event: MouseEvent) => void;
    onMouseEnter?: (geo: Geography, event: MouseEvent) => void;
    onMouseLeave?: (geo: Geography, event: MouseEvent) => void;
    key?: string | number;
    className?: string;
  }

  export interface MarkerProps {
    coordinates: [number, number];
    onClick?: (event: MouseEvent) => void;
    onMouseEnter?: (event: MouseEvent) => void;
    onMouseLeave?: (event: MouseEvent) => void;
    children?: ReactNode;
    className?: string;
    style?: CSSProperties;
  }

  export function ComposableMap(props: ComposableMapProps): JSX.Element;
  export function ZoomableGroup(props: ZoomableGroupProps): JSX.Element;
  export function Geographies(props: GeographiesProps): JSX.Element;
  export function Geography(props: GeographyProps): JSX.Element;
  export function Marker(props: MarkerProps): JSX.Element;
  export function Graticule(props: { stroke?: string; strokeWidth?: number }): JSX.Element;
  export function Sphere(props: { fill?: string; stroke?: string; strokeWidth?: number }): JSX.Element;
}
