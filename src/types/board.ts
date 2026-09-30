export type ToolType =
  | 'pen'
  | 'highlighter'
  | 'eraser'
  | 'line'
  | 'dashed-line'
  | 'arrow'
  | 'double-arrow'
  | 'rect'
  | 'square'
  | 'circle'
  | 'ellipse'
  | 'triangle'
  | 'right-triangle'
  | 'axes'
  | 'laser'
  | 'pan'
  // PRO shapes
  | 'trapezoid'
  | 'right-trapezoid'
  | 'parallelogram'
  | 'rhombus'
  | 'box3d'
  | 'cube3d'
  | 'cylinder3d'
  | 'cone3d'
  | 'pyramid3d';

export type EraserMode = 'object' | 'stroke';

export type BoardBackground =
  | 'grid'
  | 'math_grid'
  | 'ruled'
  | 'mm'
  | 'millimeter'
  | 'clean'
  | 'chalkboard'
  | 'blueprint'
  | 'map-world'
  | 'map_world'
  | 'map-russia'
  | 'map_russia';


export interface Point {
  x: number;
  y: number;
  pressure?: number;
  timestamp?: number;
}

export interface Stroke {
  id: string;
  tool: ToolType;
  points: Point[];
  color: string;
  width: number;
  opacity?: number;
}

export interface LaserPoint {
  x: number;
  y: number;
  time: number;
}

export interface MathElement {
  id: string;
  x: number;
  y: number;
  cleanText?: string;
  latex: string;
  fontSize: number;
  color: string;
  text?: string;
  fontStyle?: 'handwriting' | 'calligraphy' | 'school' | 'latex';
  result?: string;
  isSolved?: boolean;
  steps?: string[];
  finalAnswer?: string;
}

export interface RecognitionResult {
  cleanText: string;
  latex: string;
  text: string;
  result?: string;
  category?: string;
}

export interface GraphPlot {
  id: string;
  x: number;
  y: number;
  formula: string;
  color: string;
  rangeX: [number, number];
  cellSize: number;
}

export type ThemeType = 'notebook' | 'chalkboard' | 'blueprint' | 'clean';

export type SubjectMode = 'algebra' | 'geometry';

export interface PageData {
  id: string;
  title: string;
  strokes: Stroke[];
  mathElements: MathElement[];
  graphs: GraphPlot[];
  pan: { x: number; y: number };
  zoom: number;
  background?: BoardBackground;
}

export interface ToolbarCustomization {
  pen: boolean;
  highlighter: boolean;
  eraser: boolean;
  shapes: boolean;
  axes: boolean;
  ruler: boolean;
  protractor: boolean;
  graphPlotter: boolean;
  quickMath: boolean;
  laser: boolean;
  pan: boolean;
}
