import { DynamicTexture, Scene, Texture } from '@babylonjs/core';

/** A leaded pane used by the same window in the two hall scenes. */
export function hallWindowGlass(scene: Scene, clearLeaded = false, rear = true): DynamicTexture {
  const width = 768, height = 1024;
  const texture = new DynamicTexture('hall-rear-leaded-glass', { width, height }, scene, true);
  const ctx = texture.getContext();
  ctx.fillStyle = '#463c2f';
  ctx.fillRect(0, 0, width, height);

  const clear = clearLeaded ? ['#c7d2db', '#cdd8e2', '#bac6d1', '#d2dbe5', '#c2cdd8']
    : ['#e0cf9f', '#cbbd93', '#ede0ba', '#c6c6a8', '#ddc18a', '#ddd6ac'];
  const accent = ['#b2c2ab', '#92b7b6', '#bea3bd', '#d79d6e', '#c9ac7e'];
  const stepX = clearLeaded && !rear ? 128 : 28;
  const stepY = clearLeaded && !rear ? 144 : 42;
  ctx.strokeStyle = clearLeaded ? '#283745' : '#4e4739';
  ctx.lineWidth = clearLeaded && !rear ? 7 : 2.2;
  for (let row = 0; row * stepY / 2 <= height + stepY / 2; row++) {
    for (let col = -1; col * stepX <= width; col++) {
      const x = (col + (row % 2) / 2) * stepX;
      const y = row * stepY / 2;
      const seed = (row * 73 + (col + 1) * 31 + row * (col + 1) * 13) % 113;
      const colors = !clearLeaded && seed % 7 === 0 ? accent : clear;
      ctx.fillStyle = colors[seed % colors.length];
      ctx.beginPath();
      ctx.moveTo(x, y - stepY / 2);
      ctx.lineTo(x + stepX / 2, y);
      ctx.lineTo(x, y + stepY / 2);
      ctx.lineTo(x - stepX / 2, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  // A few colored rondels read through the lattice without obscuring the stone divisions.
  const colors = [
    ['#b9cbb4', '#659284', '#d3b473'],
    ['#d4b8cd', '#897caa', '#d6ad74'],
    ['#e0c78c', '#ae825f', '#d39b7a'],
  ];
  for (let bay = 0; !clearLeaded && bay < 3; bay++) {
    const x = (bay + 0.5) * width / 3;
    const y = 230, radius = 30;
    const [outer, inner, center] = colors[bay];
    ctx.lineWidth = 3.1;
    for (const [r, fill] of [[radius, outer], [radius * 0.77, inner], [radius * 0.25, center]] as const) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.stroke();
    }
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      const dx = Math.cos(angle), dy = Math.sin(angle);
      ctx.beginPath();
      ctx.moveTo(x + dx * radius * 0.25, y + dy * radius * 0.25);
      ctx.lineTo(x + dx * radius, y + dy * radius);
      ctx.stroke();
    }
  }

  texture.wrapU = texture.wrapV = Texture.CLAMP_ADDRESSMODE;
  texture.anisotropicFilteringLevel = 8;
  texture.update();
  return texture;
}
