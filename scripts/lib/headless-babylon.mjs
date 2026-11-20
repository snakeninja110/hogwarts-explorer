// Headless Babylon bootstrap for Node.
//
// Why this exists: the castle generators only need a Scene, not a GPU. Babylon's
// NullEngine runs the full generator pipeline without WebGL, so geometry can be
// asserted in CI and by agents before any browser is involved.
//
// Two things the browser provides for free have to be stubbed here:
//   1. OffscreenCanvas — DynamicTexture (glass, paving) draws into one.
//   2. a 2D context — the generators call arbitrary drawing methods on it, so the
//      stub answers every unknown method with a no-op instead of enumerating them.

function makeStubContext(width, height) {
  const target = {
    canvas: { width, height },
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    createPattern: () => null,
    measureText: () => ({ width: 0 }),
  };
  return new Proxy(target, {
    get: (t, key) => (key in t ? t[key] : () => {}),
    set: (t, key, value) => {
      t[key] = value;
      return true;
    },
  });
}

class OffscreenCanvasStub {
  constructor(width, height) {
    this.width = width;
    this.height = height;
  }
  getContext() {
    return makeStubContext(this.width, this.height);
  }
}

export function installBrowserStubs() {
  if (typeof globalThis.OffscreenCanvas === 'undefined') {
    globalThis.OffscreenCanvas = OffscreenCanvasStub;
  }
  // NullEngine registers a resize listener on dispose; Node has no window, so
  // give it the minimal event surface it expects.
  const noop = () => {};
  for (const method of ['addEventListener', 'removeEventListener', 'dispatchEvent']) {
    if (typeof globalThis[method] !== 'function') {
      globalThis[method] = method === 'dispatchEvent' ? () => true : noop;
    }
  }
  if (typeof globalThis.window === 'undefined') {
    globalThis.window = globalThis;
  }
}
