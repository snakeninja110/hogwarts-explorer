import { DynamicTexture, Scene, Texture } from '@babylonjs/core';
import { TILE_METRES } from './Masonry';

/** A repeating, staggered stone course with a narrow mortar joint. */
export function stonePaving(scene: Scene, size: number, colors: readonly string[]): DynamicTexture {
  const pixels = 512;
  const texture = new DynamicTexture('stone-paving', pixels, scene, true);
  const ctx = texture.getContext();
  const width = pixels / 6;
  const height = pixels / 8;
  ctx.fillStyle = '#515358';
  ctx.fillRect(0, 0, pixels, pixels);
  for (let row = 0; row < 8; row++) {
    for (let col = -1; col < 6; col++) {
      const x = (col + (row % 2) * 0.5) * width;
      const y = row * height;
      const tile = row * 6 + (col + 6) % 6;
      const tone = ((Math.imul(tile + 31, 0x9e3779b1) ^ Math.imul(tile + 7, 0x85ebca6b)) >>> 16) % colors.length;
      ctx.fillStyle = colors[tone];
      ctx.fillRect(x + 1, y + 1, width - 2, height - 2);
      ctx.fillStyle = '#ffffff17';
      ctx.fillRect(x + 1, y + 1, width - 2, 2);
      ctx.fillRect(x + 1, y + 2, 2, height - 3);
      ctx.fillStyle = '#23283222';
      ctx.fillRect(x + width - 3, y + 2, 2, height - 3);
      ctx.fillRect(x + 2, y + height - 3, width - 3, 2);
    }
  }
  texture.uScale = texture.vScale = TILE_METRES / size;
  texture.wrapU = texture.wrapV = Texture.WRAP_ADDRESSMODE;
  texture.anisotropicFilteringLevel = 8;
  texture.update();
  return texture;
}
