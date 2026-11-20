# Hogwarts Explorer

## 建筑建模前先查资料

1. 新建或改造建筑前，先看 [本地参考素材](references/) 和 [建筑资料](docs/hogwarts-architecture-references.md) 里的高清原图。核对建筑名、版本和本次涉及的立面。外观以实体模型的高清照片为主要依据。
2. 照片看不到的角度或构件，优先旋转、放大查看 [Mosyan 的华纳影棚城堡扫描](docs/hogwarts-architecture-references.md#影棚模型的摄影测量扫描)。仍看不清时，上网补查细节近照。GLB 用于辅助核对位置和相对尺寸。
3. 需要电影镜头才能补足细节时，指出缺的是哪处构件或角度。收到电影文件后，截取清晰画面，存到 `references/<建筑>/film-frames/`，并记录片名、版本、时间码和画面所示部位。
4. 建模前在建筑资料里记录采用的文件或链接、能确认的部位和待核细节。影棚模型、实体布景、电影和游戏画面各自注明版本和用途。

## 改完必须跑检查

```
npm run check
```

三道检查，约 3.7 秒：类型（`tsc --noEmit`）、项目约定（`lint-conventions.mjs`）、场景几何（`verify-scene.mjs`）。全部通过才算改完。没跑就提交，等于把问题留给下一个人。

### 改了几何就要更新基线

改了建筑比例、位置或细分，`verify:scene` 会失败。这是设计如此——它在问"你确定要动这些建筑吗"。确认无误后：

```
npm run verify:scene:update
git diff docs/architecture/scene-baseline.json
```

**第二个命令不是可选的。** 基线 diff 就是这次的评审材料：它逐网格列出哪些建筑移动了几米、哪些顶点数变了。扫一眼这个 diff，比在浏览器里转半天视角更快发现问题。diff 里出现你没打算动的建筑，说明改错了地方。

## 这些事已经有确定性检查，不要靠自觉

以下规则由 `lint-conventions.mjs` 强制，违反直接失败。不要绕过，也不要往注释里写理由——设立这些规则的原因，正是"注释拦不住任何事"。

| 规则 | 为什么 |
|---|---|
| 城堡几何只用 `Masonry` 批处理，不直接用 `MeshBuilder` | 每次裸调用都是一个独立 draw call，会悄悄推高开销且没有可见征兆 |
| 循环里不新建材质 | 每个材质一次 shader 编译；`CastleGroundsZone` 的既有欠账已冻结，只许减不许增 |
| 世界坐标从 `castleLayout.ts` 取，不在生成器里写死 | 两处各写一份的数字必然漂移，而且没有任何东西会报错 |
| 注释里不写 TODO / FIXME / "temporarily" | 这是留给下一个 agent 的"可以停在这里"的许可 |
| zone 必须实现 `IZone` 全部成员 | 少一个成员会在切换 zone 的瞬间炸，这是最难查的时机 |

`CastleGroundsZone.ts` 里有 1 处循环内建材质的历史欠账，允许保留但不许变多。要改它请顺手改成共享实例，然后把 `DEBT_CEILING` 里的数字减掉。

## 层依赖方向

```
components/ ──> core/ ──> world/, rendering/, utils/
world/  ──> rendering/    (单向)
world/  ──> components/   ✗ 禁止
world/  ──> core/, audio/ ✗ 禁止
```

`src/world/` 必须能脱离浏览器运行——`verify-scene.mjs` 靠这个前提在 Node 里构建整座城堡。一旦 world 层引入 `components/`、`core/` 或 `audio/`，无头验证就失效，而那是这个项目目前唯一能自动发现问题的手段。

## 新增 zone 时

1. 实现 `IZone` 全部成员，`id` 用小写下划线（`great_hall`）。
2. 在 `ZoneManager` 构造函数里 `registerZone(id, factory)`。
3. 跑 `npm run verify:scene`。注意：新 zone 的几何如果没有进入 `CastleExterior.build()`，基线不会覆盖它——需要显式加进 `verify-scene.mjs` 的构建流程，否则它是一块验证盲区。

## 术语

改名前查 [GLOSSARY.md](GLOSSARY.md)。Zone、Collision Proxy、Fallback Mesh 都是有明确边界的术语，不是可以随手替换的同义词。
