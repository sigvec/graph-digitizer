import type { TraceImage } from './image';
import type { TraceOptions, TracePoint, TraceResult, TraceVector } from './types';

export interface CurveTracer {
    trace(
        image: TraceImage,
        start: TracePoint,
        direction: TraceVector,
        options: TraceOptions,
    ): TraceResult;
}
