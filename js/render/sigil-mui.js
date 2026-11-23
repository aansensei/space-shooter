// Pisces: Space Journey. Copyright (c) 2024 An Nguyen. Licensed under the PolyForm Noncommercial License 1.0.0.
// Wraith Warden (mui) visual coordinator: orchestrates modular sub-renderers:
// * sigil-mui-common.js: shared configs, image loader, bake caches, math helpers, pool emitter
// * sigil-mui-call.js: defines _drawMuiWindup() and _drawMuiCall()
// * sigil-mui-call-detail.js: defines _drawMuiCallDetail()
// * sigil-mui-blades.js: defines _drawMuiBlades()
// * sigil-mui-impacts.js: defines _drawMuiImpacts()
// * sigil-mui-pools.js: defines _drawMuiArray()
// * sigil-mui-status.js: defines _drawMuiEnemyStatus() and _drawMuiStatus()
// * sigil-mui-ship.js: defines _drawMuiShipStatus()
// * sigil-mui-ship-fx.js: defines _drawMuiShipFx()
// * sigil-mui-meter.js: defines _drawMuiMeter()
// * sigil-mui-ui.js: defines _drawMuiUi()

if (typeof window !== 'undefined') {
    window._muiRenderModuleLoaded = true;
}
