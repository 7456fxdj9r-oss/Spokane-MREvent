// Metabolic Momentum — shared dual-axis chart engine.
//
// Used by:
//   cearra.html, kolby.html  (preset: 'mobile')         — phone-sized story page
//   presentation.html        (preset: 'presentation')   — full-screen TV deck
//
// Series shape:
//   { name, color, suffix, axis: 'left' | 'right', data: [[date_str, value], ...] }
//
// Two y-axes:
//   left   = lb scale, snapped to nice 25s/50s, holds Weight + Lean Mass
//   right  = % scale,  snapped to nice 5s,      holds Body Fat
//
// All series share one set of horizontal gridlines (computed from the lb
// axis); right-axis tick labels are computed at those same y positions
// for the % scale and pinned to the far-right edge so they don't collide
// with the per-series end-of-line value labels.

(function (global) {
    'use strict';

    var SVG_NS = 'http://www.w3.org/2000/svg';
    function el(name, attrs) {
        var n = document.createElementNS(SVG_NS, name);
        for (var k in attrs) n.setAttribute(k, attrs[k]);
        return n;
    }

    var PRESETS = {
        // Phone-sized story page chart
        mobile: {
            pad:           { top: 22, right: 64, bottom: 30, left: 42 },
            stroke:        2.6,
            dotR:          1.8,
            endDotR:       4.5,
            endDotStroke:  2,
            axisFont:      10,
            axisCapFont:   10,
            endLabelFont:  11,
            dateFont:      11,
            axisLabelYOff: 3,    // tick text baseline offset from gridline
            axisCapYOff:   6,    // axis cap ("lb"/"BF%") offset above pad.top
            dateYOff:      10,   // date label offset above bottom edge
            endLabelXOff:  6,
            endLabelYOff:  4,
            labelGap:      14,
            bottomPadding: 4,
            // Default size if SVG hasn't laid out yet
            defaultWidth:  320,
            fixedHeight:   300
        },
        // Full-screen presentation chart (1920×1080 stage)
        presentation: {
            pad:           { top: 36, right: 170, bottom: 50, left: 80 },
            stroke:        4,
            dotR:          3,
            endDotR:       8,
            endDotStroke:  3,
            axisFont:      18,
            axisCapFont:   16,
            endLabelFont:  20,
            dateFont:      18,
            axisLabelYOff: 6,
            axisCapYOff:   12,
            dateYOff:      14,
            endLabelXOff:  12,
            endLabelYOff:  7,
            labelGap:      26,
            bottomPadding: 6,
            defaultWidth:  800,
            fixedHeight:   null   // height comes from the SVG container
        }
    };

    function draw(svgId, series, opts) {
        opts = opts || {};
        var preset = PRESETS[opts.preset || 'mobile'];
        if (!preset) throw new Error('Unknown chart preset: ' + opts.preset);

        var svg = typeof svgId === 'string' ? document.getElementById(svgId) : svgId;
        if (!svg) return;

        var W = svg.clientWidth || preset.defaultWidth;
        var H = preset.fixedHeight || svg.clientHeight;
        if (!W || !H) return;  // hidden — caller will retry on next frame

        var pad = preset.pad;
        var iw = W - pad.left - pad.right;
        var ih = H - pad.top - pad.bottom;

        svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
        while (svg.firstChild) svg.removeChild(svg.firstChild);

        // Split series by axis
        var allTimes = [], lbSeries = [], pctSeries = [];
        series.forEach(function (s) {
            var pts = s.data.map(function (d) {
                return { t: new Date(d[0]).getTime(), v: d[1] };
            });
            pts.forEach(function (p) { allTimes.push(p.t); });
            var entry = {
                name: s.name, color: s.color, suffix: s.suffix,
                pts: pts, last: pts[pts.length - 1]
            };
            (s.axis === 'right' ? pctSeries : lbSeries).push(entry);
        });

        if (!allTimes.length || !lbSeries.length) return;

        var tMin = Math.min.apply(null, allTimes);
        var tMax = Math.max.apply(null, allTimes);

        // Left axis (lb): cover all weight + lean values, snap to nice steps
        var lbVals = [];
        lbSeries.forEach(function (s) { s.pts.forEach(function (p) { lbVals.push(p.v); }); });
        var rawLbMin = Math.min.apply(null, lbVals);
        var rawLbMax = Math.max.apply(null, lbVals);
        var lbStep = (rawLbMax - rawLbMin) > 120 ? 50 : 25;
        var lbMin = Math.floor(rawLbMin / lbStep) * lbStep;
        var lbMax = Math.ceil(rawLbMax / lbStep) * lbStep;
        var lbTicks = (lbMax - lbMin) / lbStep;

        // Right axis (%): cover BF range, snap to nice 5s
        var pctVals = [];
        pctSeries.forEach(function (s) { s.pts.forEach(function (p) { pctVals.push(p.v); }); });
        var pctMin = pctVals.length ? Math.floor(Math.min.apply(null, pctVals) / 5) * 5 : 0;
        var pctMax = pctVals.length ? Math.ceil(Math.max.apply(null, pctVals) / 5) * 5 : 100;

        function x(t) { return pad.left + ((t - tMin) / (tMax - tMin)) * iw; }
        function yL(v) { return pad.top + (1 - (v - lbMin) / (lbMax - lbMin)) * ih; }
        function yR(v) { return pad.top + (1 - (v - pctMin) / (pctMax - pctMin)) * ih; }

        // Gridlines + dual-axis tick labels
        for (var i = 0; i <= lbTicks; i++) {
            var f = i / lbTicks;
            var gy = pad.top + (1 - f) * ih;
            svg.appendChild(el('line', {
                x1: pad.left, x2: W - pad.right, y1: gy, y2: gy,
                stroke: 'rgba(255,255,255,0.07)', 'stroke-width': '1'
            }));
            svg.appendChild(el('text', {
                x: pad.left - 6, y: gy + preset.axisLabelYOff,
                fill: 'rgba(255,255,255,0.45)',
                'font-size': preset.axisFont, 'text-anchor': 'end'
            })).textContent = Math.round(lbMin + (lbMax - lbMin) * f);
            if (pctSeries.length) {
                svg.appendChild(el('text', {
                    x: W - 4, y: gy + preset.axisLabelYOff,
                    fill: 'rgba(255,255,255,0.40)',
                    'font-size': preset.axisFont, 'text-anchor': 'end'
                })).textContent = Math.round(pctMin + (pctMax - pctMin) * f) + '%';
            }
        }

        // Axis unit caps
        svg.appendChild(el('text', {
            x: pad.left - 6, y: pad.top - preset.axisCapYOff,
            fill: 'rgba(255,255,255,0.55)',
            'font-size': preset.axisCapFont, 'font-weight': '600', 'text-anchor': 'end'
        })).textContent = 'lb';
        if (pctSeries.length) {
            svg.appendChild(el('text', {
                x: W - 4, y: pad.top - preset.axisCapYOff,
                fill: 'rgba(255,255,255,0.55)',
                'font-size': preset.axisCapFont, 'font-weight': '600', 'text-anchor': 'end'
            })).textContent = 'BF%';
        }

        // X-axis date endpoints
        var d0 = new Date(tMin), d1 = new Date(tMax);
        function fmtDate(d) { return (d.getMonth() + 1) + '/' + String(d.getFullYear()).slice(2); }
        svg.appendChild(el('text', {
            x: pad.left, y: H - preset.dateYOff,
            fill: 'rgba(255,255,255,0.4)',
            'font-size': preset.dateFont, 'text-anchor': 'start'
        })).textContent = fmtDate(d0);
        svg.appendChild(el('text', {
            x: W - pad.right, y: H - preset.dateYOff,
            fill: 'rgba(255,255,255,0.4)',
            'font-size': preset.dateFont, 'text-anchor': 'end'
        })).textContent = fmtDate(d1);

        // Per-series lines + dots; defer end-of-line labels for collision pass
        var endLabels = [];
        function drawSeries(s, yFn) {
            var lineD = s.pts.map(function (p, i) {
                return (i === 0 ? 'M ' : 'L ') + x(p.t) + ' ' + yFn(p.v);
            }).join(' ');
            svg.appendChild(el('path', {
                d: lineD, fill: 'none', stroke: s.color,
                'stroke-width': preset.stroke,
                'stroke-linecap': 'round', 'stroke-linejoin': 'round',
                opacity: '0.95'
            }));
            s.pts.forEach(function (p) {
                svg.appendChild(el('circle', {
                    cx: x(p.t), cy: yFn(p.v), r: preset.dotR,
                    fill: s.color, opacity: '0.85'
                }));
            });
            // Emphasise endpoint
            svg.appendChild(el('circle', {
                cx: x(s.last.t), cy: yFn(s.last.v), r: preset.endDotR,
                fill: s.color, stroke: '#1a252f', 'stroke-width': preset.endDotStroke
            }));
            var v = s.last.v;
            var displayVal = (v === Math.floor(v)) ? v : v.toFixed(1);
            endLabels.push({
                x: x(s.last.t) + preset.endLabelXOff,
                y: yFn(s.last.v) + preset.endLabelYOff,
                color: s.color,
                text: displayVal + s.suffix
            });
        }

        lbSeries.forEach(function (s) { drawSeries(s, yL); });
        pctSeries.forEach(function (s) { drawSeries(s, yR); });

        // Collision avoidance: sort by y, push down anything that overlaps,
        // then if we run past the bottom of the plot area, push the whole
        // stack back up so it stays inside the chart.
        endLabels.sort(function (a, b) { return a.y - b.y; });
        for (var k = 1; k < endLabels.length; k++) {
            if (endLabels[k].y - endLabels[k - 1].y < preset.labelGap) {
                endLabels[k].y = endLabels[k - 1].y + preset.labelGap;
            }
        }
        var bottomLimit = pad.top + ih + preset.bottomPadding;
        var overflow = endLabels.length ? endLabels[endLabels.length - 1].y - bottomLimit : 0;
        if (overflow > 0) {
            endLabels.forEach(function (lbl) { lbl.y -= overflow; });
        }

        endLabels.forEach(function (lbl) {
            svg.appendChild(el('text', {
                x: lbl.x, y: lbl.y,
                fill: lbl.color, 'font-size': preset.endLabelFont, 'font-weight': '700',
                'text-anchor': 'start'
            })).textContent = lbl.text;
        });
    }

    global.MetabolicChart = { draw: draw };
})(window);
