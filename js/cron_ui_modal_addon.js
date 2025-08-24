/*!
 * CronUI Modal Addon (compact wrapper)
 * Depends on: jQuery, cron-ui-jquery-plugin.js, and optional language packs.
 * Default behavior: open the modal via the trailing button (no auto-open on focus).
 */
(function($, win){
    if (!$) return;

    // Fallback strings (can be overridden by language packs)
    const FALLBACK = {
        openBuilder: 'Edit',
        builderTitle: 'Build schedule',
        apply: 'Apply',
        cancel: 'Cancel',
        close: 'Close',
        expressionPlaceholder: 'cron expression…'
    };
    function L(locale, key){
        const lbl = (win.CronUI_i18n && win.CronUI_i18n[locale] && win.CronUI_i18n[locale].lbl) || {};
        return lbl[key] || FALLBACK[key] || key;
    }
    const UID = ()=> 'cu'+Math.random().toString(36).slice(2,9);

    $.fn.cronUICompact = function(opts){
        const settings = Object.assign({
            flavor: 'crontab',
            locale: 'en',
            openOn: 'button', // 'button' | 'focus' | 'both' (default 'button' avoids accidental opens)
            button: true,
            value: '',
            onChange: null
        }, opts||{});

        return this.each(function(){
            const $host = $(this).addClass('cu-compact-host').empty();
            const id = UID();
            const titleId = 'cu-title-'+id;

            // Inline compact UI
            const $inputWrap = $('<div class="cu-compact" />');
            const $expr = $('<input type="text" class="cu-input cu-expression-compact" />')
                .attr('placeholder', L(settings.locale, 'expressionPlaceholder'))
                .val(settings.value || '');
            $inputWrap.append($expr);

            let $btn;
            if (settings.button !== false) {
                $btn = $('<button type="button" class="cu-btn cu-compact-edit" />')
                    .text(L(settings.locale, 'openBuilder'));
                $inputWrap.append($btn);
            }
            $host.append($inputWrap);

            // Modal skeleton (hidden by default)
            const $overlay = $(`
        <div class="cu-overlay" role="dialog" aria-modal="true" aria-labelledby="${titleId}" hidden>
          <div class="cu-dialog" tabindex="-1">
            <div class="cu-modal-head">
              <div class="cu-title" id="${titleId}">${L(settings.locale,'builderTitle')}</div>
              <button type="button" class="cu-btn cu-close" aria-label="${L(settings.locale,'close')}">×</button>
            </div>
            <div class="cu-modal-body"><div class="cu-builder"></div></div>
            <div class="cu-modal-actions">
              <button type="button" class="cu-btn cu-cancel">${L(settings.locale,'cancel')}</button>
              <button type="button" class="cu-btn cu-apply">${L(settings.locale,'apply')}</button>
            </div>
          </div>
        </div>`);
            $('body').append($overlay);

            const $builderHost = $overlay.find('.cu-builder');
            let builderAPI = null;
            let exprBeforeOpen = '';

            function ensureBuilder(){
                // Only build once, and only if the core plugin exists
                if (!$builderHost.data('cronUI')) {
                    if (!$.fn.cronUI) {
                        console.warn('[cronUICompact] cronUI core plugin not found. Did you include cron-ui-jquery-plugin.js before the addon?');
                        return false;
                    }
                    $builderHost.cronUI({
                        flavor: settings.flavor,
                        locale: settings.locale,
                        onChange: (expr) => {
                            $expr.val(expr);
                            if (typeof settings.onChange === 'function') settings.onChange(expr);
                        }
                    });
                    builderAPI = $builderHost.data('cronUI');
                }
                return true;
            }

            function open(){
                if (!ensureBuilder()) return;
                exprBeforeOpen = $expr.val();
                if (exprBeforeOpen) builderAPI.setFrom(exprBeforeOpen);
                $overlay.removeAttr('hidden');
                // Focus management
                requestAnimationFrame(() => $overlay.find('.cu-dialog')[0].focus());
            }
            function close(){
                $overlay.attr('hidden', true);
            }
            function cancel(){
                // Restore previous value
                $expr.val(exprBeforeOpen);
                if (exprBeforeOpen && builderAPI) builderAPI.setFrom(exprBeforeOpen);
                close();
            }

            // Triggers
            if (settings.openOn === 'focus' || settings.openOn === 'both') {
                $expr.on('focus', function(){
                    // Prevent “instant open” on page load due to script-driven focus:
                    setTimeout(() => { if ($(this).is(':focus')) open(); }, 0);
                });
            }
            if (settings.openOn === 'button' || settings.openOn === 'both') {
                if ($btn) $btn.on('click', open);
            }

            // Modal actions
            $overlay.on('click', '.cu-close', cancel);
            $overlay.on('click', '.cu-cancel', cancel);
            $overlay.on('click', '.cu-apply', close);
            // Backdrop click (cancel)
            $overlay.on('mousedown', function(e){ if (e.target === this) cancel(); });
            // Esc to close
            $overlay.on('keydown', function(e){ if (e.key === 'Escape') cancel(); });

            // Expose API
            const api = {
                open, close,
                getExpression(){ return $expr.val(); },
                setExpression(v){ $expr.val(v||''); if (builderAPI) builderAPI.setFrom($expr.val()); },
                setLocale(loc){
                    settings.locale = loc || 'en';
                    if ($btn) $btn.text(L(settings.locale,'openBuilder'));
                    $expr.attr('placeholder', L(settings.locale,'expressionPlaceholder'));
                    $overlay.find('#'+titleId).text(L(settings.locale,'builderTitle'));
                    $overlay.find('.cu-close').attr('aria-label', L(settings.locale,'close'));
                    $overlay.find('.cu-cancel').text(L(settings.locale,'cancel'));
                    $overlay.find('.cu-apply').text(L(settings.locale,'apply'));
                    if (builderAPI) builderAPI.setLocale(settings.locale);
                }
            };
            $host.data('cronUICompact', api);
        });
    };

})(jQuery, window);
