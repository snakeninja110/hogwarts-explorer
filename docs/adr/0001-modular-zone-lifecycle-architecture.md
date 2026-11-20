# Modular Zone Lifecycle Architecture

To support 7+ explorable areas across Hogwarts without the performance overhead and WebGL context thrashing of multiple Babylon `Scene` instances, we structure the world around a single persistent `Scene` managed by a `ZoneManager` and modular `Zone` implementations. Each `Zone` independently controls its mesh loading, collision hulls, lighting adjustments, and disposal while sharing the camera, renderer, and HUD bridge.
