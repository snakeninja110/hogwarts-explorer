# Decoupled Collision Proxies

To prevent significant frame-rate drops and player clipping caused by running collision detection on complex multi-thousand polygon architectural models, we explicitly disable collisions on visual meshes (`checkCollisions = false`). Player movement, ground clamping, and boundary restrictions are enforced exclusively using invisible, low-polygon geometric proxies (`Collision Proxy`) aligned with the visual landmarks.
