/*!
 * CronUI Modal Addon (compact wrapper with parse-from-expression)
 * Depends on: jQuery, cron-ui-jquery-plugin.js (core), optional language packs.
 *
 *  Usage A - place a div with the id cron-compact
 *   $('#cron-compact').cronUICompact({
 *     flavor: 'quartz',
 *     locale: 'nl',
 *     openOn: 'both',   // 'button' | 'focus' | 'both'
 *     button: true,     // show trailing button
 *     value: '',        // initial expression; parsed into builder on first open
 *     onChange: (expr) => {}
 *   });
 *
 *  Usage B - bind to an existing field inside your form
 *   <input id="myfield" name="cron" class="form-control cron-compact" />
 *   $('.cron-compact').cronUICompact({
 *       input:'#myfield',
 *       openOn:'button',
 *       flavor:'quartz',
 *       locale:'nl'
 *  });
 *
 *   API:
 *   const api = $('#cron-compact').data('cronUICompact');
 *   api.open(); api.close();
 *   api.getExpression();
 *   api.setFrom('0 15 10 ? * 2,4,6 *');  // parse into UI + builder
 *   api.setExpression('...');             // alias of setFrom
 *   api.setLocale('en');
 *
 */
(function ($, win) {
    if (!$) return;


    const FALLBACK = {
        openBuilder: 'Edit',
        builderTitle: 'Build schedule',
        apply: 'Apply',
        cancel: 'Cancel',
        close: 'Close',
        expressionPlaceholder: 'cron expression…'
    };

    function L(locale, key) {
        const p = (win.CronUI_i18n && win.CronUI_i18n[locale] && win.CronUI_i18n[locale].lbl) || {};
        return p[key] || FALLBACK[key] || key;
    }


    const UID = () => 'cu' + Math.random().toString(36).slice(2, 9);


    $.fn.cronUICompact = function (opts) {
        const settings = Object.assign({
            flavor: 'crontab',
            locale: 'en',
            openOn: 'both', // 'button' | 'focus' | 'both'
            button: true,
            value: '',
            input: null, // selector/element for existing input
            buttonTarget: null, // where to append the button (if using existing input)
            onChange: null
        }, opts || {});


        return this.each(function () {
            const $host = $(this).addClass('cu-compact-host');
            $host.empty();


            const id = UID();
            const titleId = 'cu-title-' + id;


            // Determine expression input: existing or create new
            let usingExternal = false;
            let $expr;
            if (settings.input) {
                $expr = $(settings.input);
                usingExternal = $expr && $expr.length > 0;
            }


            let $btn;
            if (!usingExternal) {
                // Build compact wrapper with our own input
                const $inputWrap = $('<div class="cu-compact" />');
                $expr = $('<input type="text" class="cu-input cu-expression-compact"/>')
                    .attr('placeholder', L(settings.locale, 'expressionPlaceholder'))
                    .val(settings.value || '');
                $inputWrap.append($expr);
                if (settings.button !== false) {
                    $btn = $('<button type="button" class="cu-btn cu-compact-edit" />').text(L(settings.locale, 'openBuilder'));
                    $inputWrap.append($btn);
                }
                $host.append($inputWrap);
            } else {
                // Bind to existing input; do not reparent it
                if (!$expr.attr('placeholder')) {
                    $expr.attr('placeholder', L(settings.locale, 'expressionPlaceholder'));
                }
                if (!($expr.val() && String($expr.val()).trim()) && settings.value) {
                    $expr.val(settings.value);
                }
                if (settings.button !== false) {
                    $btn = $('<button type="button" class="cu-btn cu-compact-edit" />').text(L(settings.locale, 'openBuilder'));
                    const $target = settings.buttonTarget ? $(settings.buttonTarget) : null;
                    if ($target && $target.length) {
                        $target.append($btn);
                    } else {
                        $expr.after($btn);
                    }
                }
            }


            // Modal skeleton (appended to body)
            const $overlay = $(`
                <div class=\"cu-overlay\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"${titleId}\" hidden>
                <div class=\"cu-dialog\" tabindex=\"-1\">
                <div class=\"cu-modal-head\">
                <div class=\"cu-title\" id=\"${titleId}\">${L(settings.locale, 'builderTitle')}</div>
                <button type=\"button\" class=\"cu-btn cu-close\" aria-label=\"${L(settings.locale, 'close')}\">×</button>
                </div>
                <div class=\"cu-modal-body\"><div class=\"cu-builder\"></div></div>
                <div class=\"cu-modal-actions\">
                <button type=\"button\" class=\"cu-btn cu-cancel\">${L(settings.locale, 'cancel')}</button>
                <button type=\"button\" class=\"cu-btn cu-apply\">${L(settings.locale, 'apply')}</button>
                </div>
                </div>
                </div>`);
            $('body').append($overlay);


            const $builderHost = $overlay.find('.cu-builder');
            let builderAPI = null;
            let exprBeforeOpen = '';
            let initializing = false;

            function ensureBuilder(seed) {
                if ($builderHost.data('cronUI')) {
                    builderAPI = $builderHost.data('cronUI');
                    return true;
                }
                if (!$.fn.cronUI) {
                    console.warn('[cronUICompact] core cronUI not found.');
                    return false;
                }
                initializing = true;
                $builderHost.cronUI({
                    flavor: settings.flavor,
                    locale: settings.locale,
                    onChange: (expr) => {
                        if (initializing) return;
                        $expr.val(expr);
                        if (typeof settings.onChange === 'function') settings.onChange(expr);
                    }
                });
                builderAPI = $builderHost.data('cronUI');
                if (seed) builderAPI.setFrom(seed);
                initializing = false;
                return true;
            }


            function open() {
                const seed = ($expr.val() || '').trim();
                exprBeforeOpen = seed;
                if (!ensureBuilder(seed)) return;
                if (!initializing && builderAPI && seed) builderAPI.setFrom(seed);
                $overlay.removeAttr('hidden');
                requestAnimationFrame(() => $overlay.find('.cu-dialog')[0].focus());
            }

            function close() {
                $overlay.attr('hidden', true);
            }

            function cancel() {
                $expr.val(exprBeforeOpen);
                if (builderAPI && exprBeforeOpen) builderAPI.setFrom(exprBeforeOpen);
                close();
            }


            // Triggers
            if (settings.openOn === 'focus' || settings.openOn === 'both') {
                $expr.on('focus', function () {
                    setTimeout(() => {
                        if ($(this).is(':focus')) open();
                    }, 0);
                });
            }
            if (settings.openOn === 'button' || settings.openOn === 'both') {
                if ($btn) $btn.on('click', open);
            }
            // Modal actions
            $overlay.on('click', '.cu-close', cancel);
            $overlay.on('click', '.cu-cancel', cancel);
            $overlay.on('click', '.cu-apply', close);
            $overlay.on('mousedown', function (e) {
                if (e.target === this) cancel();
            });
            $overlay.on('keydown', function (e) {
                if (e.key === 'Escape') cancel();
            });


            // Expose API
            const api = {
                open, close, getExpression() {
                    return $expr.val();
                }, setFrom(v) {
                    const s = (Array.isArray(v) ? v.join(' ') : (v || '')).trim();
                    $expr.val(s);
                    if (ensureBuilder(s) && s) builderAPI.setFrom(s);
                }, setExpression(v) {
                    this.setFrom(v);
                }, setLocale(loc) {
                    settings.locale = loc || 'en';
                    if ($btn) $btn.text(L(settings.locale, 'openBuilder'));
                    if (!$expr.attr('data-cu-placeholder-locked')) {
                        $expr.attr('placeholder', L(settings.locale, 'expressionPlaceholder'));
                    }
                    $overlay.find('#' + titleId).text(L(settings.locale, 'builderTitle'));
                    $overlay.find('.cu-close').attr('aria-label', L(settings.locale, 'close'));
                    $overlay.find('.cu-cancel').text(L(settings.locale, 'cancel'));
                    $overlay.find('.cu-apply').text(L(settings.locale, 'apply'));
                    if (ensureBuilder()) builderAPI.setLocale(settings.locale);
                }
            };
            $host.data('cronUICompact', api);


            // Seed from initial value if provided and external field is empty
            if (settings.value && (!$expr.val() || String($expr.val()).trim() === '')) {
                api.setFrom(settings.value);
            }
        });
    };


})(jQuery, window);
