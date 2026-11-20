# Hogwarts · The Living Atlas 复用调查

**建议先用它参考城堡平面和建筑分组，在现有 Babylon.js 项目里独立建模。** 上游没有随仓库提供可直接导入的模型，也未发现复用许可。如果取得覆盖代码和生成模型的授权，最快的接入路径是只导出城堡建筑 GLB，先验证环绕视图，再为步行补齐桥面、落脚面、入口和碰撞代理。 [上游文件树](https://github.com/Cool2bwichu/Hogwarts_project/tree/d08b2e368c02c1ebb4ba8169a14b12662574eaa3) · [GitHub 仓库许可说明](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)

## 核验范围

2026-11-11 核对了公开仓库的默认分支 `claude/hogwarts-map-k6acla`，固定到提交 `d08b2e368c02c1ebb4ba8169a14b12662574eaa3`。该分支比 `main` 的 `066f587` 多 9 个提交，`main` 已在默认分支的提交历史里。仓库简介提到 Claude 和 ChatGPT 对比，但这两个分支的关系无法证明存在两套独立实现。默认提交的 Git 文件树共 29 个文件，未见 `.glb`、`.gltf`、`.obj`、`.fbx`、`.blend`、`.stl`、资产目录或导出脚本。这里的资产结论限于该提交的文件树。 [仓库简介](https://github.com/Cool2bwichu/Hogwarts_project) · [分支差异](https://github.com/Cool2bwichu/Hogwarts_project/compare/066f587b613957fa805c8d267d9c9ef5bbbfef5e...d08b2e368c02c1ebb4ba8169a14b12662574eaa3) · [固定提交文件树](https://github.com/Cool2bwichu/Hogwarts_project/tree/d08b2e368c02c1ebb4ba8169a14b12662574eaa3)

这是用静态 HTML 和 ES modules 构建的 Three.js 项目。`index.html` 从 jsDelivr 引入 Three.js `0.186.1`，README 要求 WebGL 2。查看时可在该目录运行 `python3 -m http.server 8000 --bind 127.0.0.1`，然后打开 `http://127.0.0.1:8000`。上游说明提供环绕、步行、飞行、羊皮纸地图，以及列有 28 处地点的指南。28 是指南条目数。 [运行和操作说明](https://github.com/Cool2bwichu/Hogwarts_project/blob/d08b2e368c02c1ebb4ba8169a14b12662574eaa3/README.md#L11-L41) · [Three.js import map](https://github.com/Cool2bwichu/Hogwarts_project/blob/d08b2e368c02c1ebb4ba8169a14b12662574eaa3/index.html#L277-L283)

## 城堡是怎样生成的

| 源码 | 对本项目的用途 |
| --- | --- |
| `js/world/layout.js` | 建筑平面、地点、道路与地形高度函数。1 单位为 1 米，`+x` 向东、`−z` 向北、`+y` 向上。湖面 `y=0`、高台 `y=46`、城堡地面 `y=48`。城堡主体由矩形翼楼、圆塔、大礼堂、入口、西塔和庭院组成。不同构件分别标记为原著、作者资料、推断、项目演绎或电影依据。这个分级可用于区分资料来源和设计取舍。 [坐标与建筑定义](https://github.com/Cool2bwichu/Hogwarts_project/blob/d08b2e368c02c1ebb4ba8169a14b12662574eaa3/js/world/layout.js#L1-L117) |
| `js/world/castle.js`、`js/world/builder.js` | `buildCastle()` 生成主体、塔楼、大礼堂外壳、北面门廊、庭院、露台台阶和回廊。`Builder` 按材质把构件合并为带索引的 `BufferGeometry`，导出时可按石材、屋面和玻璃调整材质。单栋楼或门洞一般没有独立节点，要单独拆出时需在生成阶段划分。 [城堡网格组](https://github.com/Cool2bwichu/Hogwarts_project/blob/d08b2e368c02c1ebb4ba8169a14b12662574eaa3/js/world/castle.js#L653-L687) · [几何合批](https://github.com/Cool2bwichu/Hogwarts_project/blob/d08b2e368c02c1ebb4ba8169a14b12662574eaa3/js/world/builder.js#L308-L324) |
| `js/main.js`、`js/ui/map.js`、`js/data/floors.js` | 地形、城堡、场地、植被和湖水分别创建。地图复用地理数据，并用楼层和房间记录绘制标注。上游步行使用建筑足迹和 `floorAt()`，能处理庭院、前庭台阶和东翼通道。大礼堂在 3D 中主要是外壳，楼层地图的房间记录不足以支撑可走进的室内。 [场景装配与步行](https://github.com/Cool2bwichu/Hogwarts_project/blob/d08b2e368c02c1ebb4ba8169a14b12662574eaa3/js/main.js#L58-L108) · [大礼堂生成](https://github.com/Cool2bwichu/Hogwarts_project/blob/d08b2e368c02c1ebb4ba8169a14b12662574eaa3/js/world/castle.js#L346-L391) · [地图入口](https://github.com/Cool2bwichu/Hogwarts_project/blob/d08b2e368c02c1ebb4ba8169a14b12662574eaa3/js/ui/map.js#L1-L18) |

上游把大礼堂布置在西北侧，正门朝北，前庭和台阶通向北面的道路。轮廓来自长条翼楼和围合庭院，和本项目当前从高架桥接近城门的布局存在位置与高度差。上游注释也明确将苏格兰哥特式细节归为项目的建筑演绎。 [上游城堡说明](https://github.com/Cool2bwichu/Hogwarts_project/blob/d08b2e368c02c1ebb4ba8169a14b12662574eaa3/js/world/castle.js#L1-L3) · [北门和台阶](https://github.com/Cool2bwichu/Hogwarts_project/blob/d08b2e368c02c1ebb4ba8169a14b12662574eaa3/js/world/castle.js#L393-L414) · [本项目外景区](../src/world/zones/CastleGroundsZone.ts)

## 接入 Babylon.js 的两条路径

### 独立生成城堡外景

当前主场景包含大礼堂、入口前庭、船屋和崖梯，后续按实拍和布局参考逐座建模。建筑外观与碰撞体共用布局坐标。当前可环绕检查礼堂外立面，也可从前庭正门走到礼堂门口，按 `E` 进入室内。 [本项目程序化外景](../src/world/generators/CastleExterior.ts) · [碰撞代理 ADR](adr/0002-decoupled-collision-proxies.md) · [外景和大礼堂交互](../src/world/zones/CastleGroundsZone.ts)

### 获得授权后导出建筑 GLB

1. 在临时导出页沿用上游的 Three.js `0.186.1`，从 `three@0.186.1/examples/jsm/exporters/GLTFExporter.js` 加载同版本 exporter。直接调用 `buildCastle()`，把它返回的 `group` 放入独立的 `THREE.Scene`，执行 `GLTFExporter.parseAsync(scene, { binary: true })`。如果在上游演示页检查网格，启动完成后的对象是 `window.__atlas.castle.group`。先限定建筑组，避免地形、湖面、植被和天空进入资产边界。 [调试入口](https://github.com/Cool2bwichu/Hogwarts_project/blob/d08b2e368c02c1ebb4ba8169a14b12662574eaa3/js/main.js#L237-L255) · [导出器 API](https://threejs.org/docs/pages/GLTFExporter.html)
2. 第一轮检查几何、顶点色与标准 PBR 参数。上游通过 `onBeforeCompile` 增加石材纹理、天气反应、来源着色和动态窗光。GLB 能传递标准材质和贴图，自定义着色器逻辑需用烘焙贴图或 Babylon.js 材质重建。可先用石材和瓦片的基础色、粗糙度，以及夜景窗户的静态发光材质验证效果。 [上游表面材质](https://github.com/Cool2bwichu/Hogwarts_project/blob/d08b2e368c02c1ebb4ba8169a14b12662574eaa3/js/engine/shared.js#L234-L270) · [上游窗玻璃](https://github.com/Cool2bwichu/Hogwarts_project/blob/d08b2e368c02c1ebb4ba8169a14b12662574eaa3/js/engine/shared.js#L347-L381) · [glTF 验证器](https://github.khronos.org/glTF-Validator/)
3. 可在独立预览中复用 `AssetLoader` 导入 GLB。当前主场景不调用这个加载器。Babylon.js 的 glTF 加载器会为默认左手场景处理手性转换。应在导入后用北门、东翼开口和湖侧立面三个可区分的锚点核对朝向，再通过模型根节点对齐水平位置和门槛高度。上游城堡地面 `y=48`，本项目的模型与路线需要根据前庭标高一并校准。 [本地资产入口](../src/utils/AssetLoader.ts) · [本地前庭标高](../src/world/castleLayout.ts) · [Babylon.js 坐标转换](https://doc.babylonjs.com/features/featuresDeepDive/importers/glTF#the-root-node)
4. 环绕模式已根据城堡网格世界包围盒定焦，先检查完整轮廓、四个方向和近距离材质。第一人称还要更新 `CastleGroundsZone` 的出生点、朝向、城门交互、桥面和墙体代理。用现有 `V` 切换视图，验证从出生点走到门口、扶栏和墙能拦住玩家、`E` 能进入大礼堂，且进出区域后模型和碰撞重新对齐。 [现有相机和快捷键](../src/core/BabylonEngine.ts) · [外景区域生命周期](../src/world/zones/CastleGroundsZone.ts)

## 许可与验证状态

核查了默认提交文件树、README 和源码，未发现 `LICENSE`、SPDX 标注或作者给出的复用条款。README 将其描述为非官方同人项目。GitHub 说明公开可查看、可 fork，复用、改作和分发需要相应权利。取得许可前，资源索引中「开源」「可直接吸纳」的说法宜按「公开源码参考，复用授权未确认」理解。项目代码许可与哈利·波特原作、电影造型等第三方权利应分别核对。 [上游 README](https://github.com/Cool2bwichu/Hogwarts_project/blob/d08b2e368c02c1ebb4ba8169a14b12662574eaa3/README.md#L1-L11) · [默认提交文件树](https://github.com/Cool2bwichu/Hogwarts_project/tree/d08b2e368c02c1ebb4ba8169a14b12662574eaa3) · [GitHub 仓库许可说明](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository#choosing-the-right-license)

本次核验基于固定提交、上游源码和本项目接入点。GLB 导出、跨引擎材质还原、文件体积、帧率及步行碰撞效果均待实际样件验证。未进行浏览器运行或模型导入。
