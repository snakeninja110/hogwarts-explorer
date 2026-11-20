# 3D 模型资源索引

Phase 2 城堡外景（Castle Grounds）及后续阶段可用的 3D 资产来源汇总。

> [!TIP]
> 当前主场景生成大礼堂、入口前庭、船屋和崖梯。这里的整堡 GLB 用于建模参考，放入 `public/models/` 不会自动替换主场景。

---

## 一、Sketchfab — Web 友好模型（首推）

直接支持 glTF/GLB 格式下载，无需格式转换。

| 模型名称 | 创作者 | 特点 | 地址 |
| :--- | :--- | :--- | :--- |
| **Hogwarts School - No terrain** | Jzax | 剥离周边山体，仅保留纯粹城堡建筑群（大礼堂、天文塔、回廊、塔尖），不与我们的程序化地形冲突，体积适中 ~20-30MB | https://sketchfab.com/search?q=hogwarts+school+no+terrain&type=models |
| **Hogwarts Castle** | jvasishta2013 | 全貌模型，带外部高架桥与庭院结构，适合全景远视点 | https://sketchfab.com/search?q=hogwarts+castle+jvasishta2013&type=models |
| **Tiny Glade Hogwarts Castle** | LukeGki | 风格化 Low-Poly 极简设计，仅数兆字节，WebGL 稳 60 FPS | https://sketchfab.com/search?q=tiny+glade+hogwarts+castle&type=models |
| **Hogwarts Castle - 3D Printable** | Loumy_GL | 结构精度高，可作为建筑比例参考 | https://sketchfab.com/search?q=hogwarts+castle+loumy&type=models |
| **Hogwarts 专题标签页** | 社区合集 | 按 Downloadable 筛选可下载模型 | https://sketchfab.com/tags/hogwartscastle |

> **使用方式**：进入模型页 → 点击 **Download 3D Model** → 选择 **glTF/GLB** 格式，在独立查看器中对照建筑轮廓和细节。

---

## 二、GitHub 开源项目 — 代码生成参考（宝藏）

| 项目 | 核心价值 | 地址 |
| :--- | :--- | :--- |
| **Cool2bwichu/Hogwarts_project** | 纯前端代码程序化渲染整座城堡与 28 个地标，不依赖外部 glb 模型。严格按照罗琳手绘地图与原著小说还原。`js/world/layout.js` 定义了所有建筑坐标、旋转角与半径（1 单位 = 1 米，`+x` 为东，`-z` 为北）。支持 WASD 漫游、飞行模式、羊皮纸地图视图、昼夜天气切换。 | https://github.com/Cool2bwichu/Hogwarts_project |

> **借鉴方向**：如需扩展纯代码程序化生成（Procedural Generation），可直接吸纳其 `layout.js` 中的几何参数定义与建筑空间拓扑关系。

---

## 三、3D 打印社区 — 拓扑最干净的实体模型

3D 打印模型经过闭合实体（Watertight）加固处理，网格干净无破面，适合减面后导出为 Web 端使用。

| 模型名称 | 创作者 | 特点 | 地址 |
| :--- | :--- | :--- | :--- |
| **Hogwarts Castle (3 parts)** | kisscoool18 | 三件式大型打印设计，结构加固，几何拓扑工整 | https://www.printables.com/search/models?q=hogwarts%20castle%20kisscoool18 |
| **Hogwarts Castle** | The_Grimclaw | 细节丰富的精细重建，适合 0.17mm 层高打印 | https://www.printables.com/search/models?q=hogwarts%20castle%20grimclaw |
| **Thingiverse Hogwarts** | 社区合集 | 更多风格与比例的变体 | https://www.thingiverse.com/search?q=hogwarts+castle&type=things |

> **转换步骤**：下载 `.stl` / `.obj` → 导入 [Blender](https://www.blender.org/)（免费） → 添加 `Decimate` 修改器压缩至 ~5 万面 → **File > Export > glTF 2.0 (.glb)** → 放入 `public/models/`。

---

## 四、游戏资产提取 — 室内场景（Phase 3/4 备用）

适合后续开发大礼堂内部、旋转楼梯、魔药学地牢等室内区域时使用。

| 来源 | 游戏 | 内容 | 地址 |
| :--- | :--- | :--- | :--- |
| **The Models Resource** | Hogwarts Legacy (PC) | 现代高精度建筑与环境资产 | https://www.models-resource.com/pc_computer/hogwartslegacy/ |
| **The Models Resource** | Harry Potter: Hogwarts Mystery (Mobile) | 角色、生物与环境模型 | https://www.models-resource.com/mobile/harrypotterhogwartsmystery/ |
| **The Models Resource** | HP & the Philosopher's Stone (PC) | 经典低面数城堡室内（大礼堂、楼梯、地牢），体积极小 ~1-2MB/间 | https://www.models-resource.com/pc_computer/harrypotterandthephilosophersstone/ |
| **The Models Resource** | HP & the Chamber of Secrets (PC) | 密室、蛇怪洞穴等独特场景 | https://www.models-resource.com/pc_computer/harrypotterandthechamberofsecrets/ |

---

## 五、付费/商业级平台（备选参考）

| 平台 | 特点 | 地址 |
| :--- | :--- | :--- |
| **CGTrader** | 大量用户创建的 Hogwarts 模型，部分支持 glTF 导出，含免费与付费 | https://www.cgtrader.com/free-3d-models?keywords=hogwarts+castle |
| **TurboSquid** | 商业级高精度模型，格式齐全（OBJ/FBX/Blend），需 Blender 转换 | https://www.turbosquid.com/Search/3D-Models/free/hogwarts+castle |
| **3D Warehouse (SketchUp)** | 建筑社区偏好平台，大量教育性霍格沃茨模型 | https://3dwarehouse.sketchup.com/search/?q=hogwarts%20castle |

---

## 六、PBR 贴图与环境光照资源（辅助资产）

程序化模型和 glb 模型均需要贴图与环境光照提升视觉表现。

| 资源类型 | 推荐平台 | 许可证 | 地址 |
| :--- | :--- | :--- | :--- |
| PBR 材质贴图（石墙/瓦片/木纹/青苔） | **ambientCG** | CC0 免费商用 | https://ambientcg.com/ |
| PBR 材质贴图 + HDR 环境贴图 | **Poly Haven** | CC0 免费商用 | https://polyhaven.com/ |
| 夜间星空 HDR 全景 | **Poly Haven HDRIs** | CC0 | https://polyhaven.com/hdris |

城堡外景使用 Poly Haven 的 CC0 贴图，包含颜色、法线及环境遮蔽与粗糙度数据。贴图随项目构建，影棚 HDR 用于照亮总览中的材质。

- 石墙 [Castle Wall Slates](https://polyhaven.com/a/castle_wall_slates)
- 屋瓦 [Roof Slates 03](https://polyhaven.com/a/roof_slates_03)
- 岩壁 [Seaside Rock](https://polyhaven.com/a/seaside_rock)
- 草地与碎石 [Aerial Grass Rock](https://polyhaven.com/a/aerial_grass_rock)
- 影棚环境光 [Studio Small 03](https://polyhaven.com/a/studio_small_03)
