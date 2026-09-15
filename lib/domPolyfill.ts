// pdfjs-dist (used by pdf-parse) checks for these browser-only globals at module
// load time and throws if they're missing in Node. We only need text extraction,
// not canvas rendering, so minimal stubs are enough to satisfy those checks.
/* eslint-disable @typescript-eslint/no-explicit-any */
const g = globalThis as any;

if (typeof g.DOMMatrix === "undefined") {
  g.DOMMatrix = class DOMMatrix {
    constructor(..._args: unknown[]) {}
  };
}
if (typeof g.ImageData === "undefined") {
  g.ImageData = class ImageData {
    constructor(..._args: unknown[]) {}
  };
}
if (typeof g.Path2D === "undefined") {
  g.Path2D = class Path2D {
    constructor(..._args: unknown[]) {}
  };
}

export {};
