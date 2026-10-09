// Pisces: Space Journey — © 2024 An Nguyen. Licensed under the MIT License.
// js/canvas-guard.js: loaded before every other game script.
//
// CanvasGradient.addColorStop throws on a colour it can't parse (an
// `rgba(...,NaN)` built from a NaN stat, or on WebKit an alpha small enough
// to print in exponent form) and on a non-finite or out of range offset.
// Hundreds of gradients build their stops from live numbers, and one throw
// aborts the whole frame's draw, blanking the game for as long as the bad
// value lasts. Here the stop is cleaned up and retried once, and dropped if
// it still won't parse, so the frame always finishes.
(function () {
    if (typeof CanvasGradient === 'undefined') return;
    const _addColorStop = CanvasGradient.prototype.addColorStop;
    let _warned = false;

    function _cleanColor(color) {
        if (typeof color !== 'string' || !/^\s*(rgba?|hsla?)\(/i.test(color)) return color;
        return color
            .replace(/NaN|-?Infinity|undefined/g, '0')
            .replace(/-?\d*\.?\d+e[-+]?\d+/gi, (m) => Number(m).toFixed(4));
    }

    CanvasGradient.prototype.addColorStop = function (offset, color) {
        try {
            return _addColorStop.call(this, offset, color);
        } catch (err) {
            const o = Number.isFinite(offset) ? Math.min(1, Math.max(0, offset)) : 0;
            if (!_warned) {
                _warned = true;
                console.warn('[canvas-guard] bad gradient stop (' + offset + ', ' + color + '), repaired', err && err.stack);
            }
            try {
                return _addColorStop.call(this, o, _cleanColor(color));
            } catch (_) {
                // still unparseable: lose this one stop, keep the frame
            }
        }
    };
})();
