(function () {
    function token(name) {
        return getComputedStyle(document.body).getPropertyValue(name).trim();
    }

    function chartColor(name) {
        return token('--oi-chart-color-' + name) || token('--oi-content-color-tertiary');
    }

    function rgba(name, alpha) {
        var color = name.indexOf('--') === 0 ? token(name) : chartColor(name);
        var hex = color.replace(/^#/, '');
        if (!/^[\da-f]{6}$/i.test(hex)) return color;
        var red = parseInt(hex.slice(0, 2), 16);
        var green = parseInt(hex.slice(2, 4), 16);
        var blue = parseInt(hex.slice(4, 6), 16);
        return 'rgba(' + red + ', ' + green + ', ' + blue + ', ' + alpha + ')';
    }

    function apply(chartLibrary) {
        if (!chartLibrary || !chartLibrary.defaults) return;
        var defaults = chartLibrary.defaults;
        var secondary = token('--oi-content-color-secondary');
        var primary = token('--oi-content-color-primary');
        var tertiary = token('--oi-content-color-tertiary');
        var border = token('--oi-border-color-muted');

        defaults.color = secondary;
        defaults.borderColor = border;
        if (defaults.font) defaults.font.family = token('--oi-font-family-default');
        if (defaults.scale) {
            if (defaults.scale.grid) defaults.scale.grid.color = border;
            if (defaults.scale.ticks) defaults.scale.ticks.color = tertiary;
        }
        if (defaults.plugins && defaults.plugins.legend && defaults.plugins.legend.labels) {
            defaults.plugins.legend.labels.color = secondary;
        }
        if (defaults.plugins && defaults.plugins.title) {
            defaults.plugins.title.color = primary;
        }
        if (defaults.plugins && defaults.plugins.tooltip) {
            defaults.plugins.tooltip.backgroundColor = primary;
            defaults.plugins.tooltip.titleColor = token('--oi-content-color-constant');
            defaults.plugins.tooltip.bodyColor = token('--oi-content-color-constant');
        }
    }

    window.irisChartTokens = { token: token, color: chartColor, rgba: rgba, apply: apply };
    if (window.Chart) apply(window.Chart);
})();
