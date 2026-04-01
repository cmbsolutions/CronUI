// ==============================
// FILE: cron_ui_modal_manager.js
// ==============================
/*!
 * CronUI Modal Manager
 * One shared modal/builder for multiple inputs on the same page or form.
 *
 * Why this exists:
 * - You may have many cron fields in one form.
 * - Creating one modal addon instance per field is repetitive.
 * - This manager creates ONE shared modal and binds it to MANY inputs.
 *
 * Features:
 * - Supports existing inputs only (does not create replacement inputs)
 * - Adds one button per input (optional)
 * - Can open on button, focus, or both
 * - Parses each field's current expression into the shared builder on open
 * - Apply writes back only to the active field
 * - Cancel restores only the active field's pre-open value
 * - Locale-aware using existing CronUI_i18n packs
 *
 * Usage:
 *   $.cronUIBindMany({
 *     inputs: '.js-cron',
 *     flavor: 'quartz',
 *     locale: 'nl',
 *     openOn: 'button',     // 'button' | 'focus' | 'both'
 *     button: true,
 *     buttonClass: 'cu-btn cu-compact-edit',
 *     buttonText: null,     // defaults to i18n openBuilder
 *     buttonPlacement: 'after', // 'after' | 'wrap'
 *     onChange: (expr, $input) => {}
 *   });
 *
 * API:
 *   const mgr = $.cronUIBindMany(...);
 *   mgr.openFor('#myInput');
 *   mgr.setLocale('en');
 *   mgr.destroy();
 */
(function($, win){
    if(!$) return;

    const FALLBACK = {
        openBuilder: 'Edit',
        builderTitle: 'Build schedule',
        apply: 'Apply',
        cancel: 'Cancel',
        close: 'Close',
        expressionPlaceholder: 'cron expression…'
    };

    function L(locale, key){
        const p = (win.CronUI_i18n && win.CronUI_i18n[locale] && win.CronUI_i18n[locale].lbl) || {};
        return p[key] || FALLBACK[key] || key;
    }

    const UID = ()=> 'cu'+Math.random().toString(36).slice(2,9);

    $.cronUIBindMany = function(opts){
        const settings = Object.assign({
            inputs: null,                 // required: selector | elements | jQuery
            flavor: 'crontab',
            locale: 'en',
            openOn: 'button',             // 'button' | 'focus' | 'both'
            button: true,
            buttonClass: 'cu-btn cu-compact-edit',
            buttonText: null,
            buttonPlacement: 'after',     // 'after' | 'wrap'
            onChange: null
        }, opts||{});

        const $inputs = $(settings.inputs || []);
        if(!$inputs.length){
            console.warn('[cronUIBindMany] No inputs matched:', settings.inputs);
            return null;
        }

        const id = UID();
        const titleId = 'cu-title-'+id;

        // Shared modal skeleton
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
        let initializing = false;
        let $activeInput = null;
        let valueBeforeOpen = '';

        function ensureBuilder(seed){
            if($builderHost.data('cronUI')){
                builderAPI = $builderHost.data('cronUI');
                return true;
            }
            if(!$.fn.cronUI){
                console.warn('[cronUIBindMany] cronUI core plugin not found. Include cron_ui_jquery_plugin.js first.');
                return false;
            }
            initializing = true;
            $builderHost.cronUI({
                flavor: settings.flavor,
                locale: settings.locale,
                onChange: (expr)=>{
                    if(initializing || !$activeInput) return;
                    $activeInput.val(expr);
                    if(typeof settings.onChange === 'function') settings.onChange(expr, $activeInput);
                }
            });
            builderAPI = $builderHost.data('cronUI');
            if(seed) builderAPI.setFrom(seed);
            initializing = false;
            return true;
        }

        function openFor(input){
            const $input = $(input).first();
            if(!$input.length) return;
            const seed = String($input.val() || '').trim();
            $activeInput = $input;
            valueBeforeOpen = seed;
            if(!ensureBuilder(seed)) return;
            if(builderAPI && seed) builderAPI.setFrom(seed);
            $overlay.removeAttr('hidden');
            requestAnimationFrame(()=> $overlay.find('.cu-dialog')[0].focus());
        }

        function close(){
            $overlay.attr('hidden', true);
        }

        function cancel(){
            if($activeInput) $activeInput.val(valueBeforeOpen);
            if(builderAPI && valueBeforeOpen) builderAPI.setFrom(valueBeforeOpen);
            close();
        }

        // Bind each input
        $inputs.each(function(index, el){
            const $input = $(el);
            if(!$input.attr('placeholder')){
                $input.attr('placeholder', L(settings.locale,'expressionPlaceholder'));
            }

            if(settings.button){
                const $btn = $('<button type="button" />')
                    .addClass(settings.buttonClass)
                    .attr('data-cronui-many-btn', '1')
                    .text(settings.buttonText || L(settings.locale,'openBuilder'));

                if(settings.buttonPlacement === 'wrap'){
                    const $wrap = $('<span class="cu-many-wrap" />');
                    $input.after($wrap);
                    $wrap.append($btn);
                } else {
                    $input.after($btn);
                }

                if(settings.openOn === 'button' || settings.openOn === 'both'){
                    $btn.on('click', function(){ openFor($input); });
                }
            }

            if(settings.openOn === 'focus' || settings.openOn === 'both'){
                $input.on('focus.cronuiMany', function(){
                    setTimeout(()=>{ if($input.is(':focus')) openFor($input); }, 0);
                });
            }
        });

        // Modal actions
        $overlay.on('click', '.cu-close', cancel);
        $overlay.on('click', '.cu-cancel', cancel);
        $overlay.on('click', '.cu-apply', close);
        $overlay.on('mousedown', function(e){ if(e.target === this) cancel(); });
        $overlay.on('keydown', function(e){ if(e.key === 'Escape') cancel(); });

        return {
            openFor,
            close,
            setLocale(loc) {
                settings.locale = loc || 'en';
                $overlay.find('#' + titleId).text(L(settings.locale, 'builderTitle'));
                $overlay.find('.cu-close').attr('aria-label', L(settings.locale, 'close'));
                $overlay.find('.cu-cancel').text(L(settings.locale, 'cancel'));
                $overlay.find('.cu-apply').text(L(settings.locale, 'apply'));
                $inputs.each(function (_, el) {
                    const $input = $(el);
                    if (!$input.attr('data-cu-placeholder-locked')) {
                        $input.attr('placeholder', L(settings.locale, 'expressionPlaceholder'));
                    }
                    const $btn = $input.siblings('[data-cronui-many-btn="1"]').first();
                    if ($btn.length && !settings.buttonText) {
                        $btn.text(L(settings.locale, 'openBuilder'));
                    }
                });
                if (ensureBuilder()) builderAPI.setLocale(settings.locale);
            },
            destroy() {
                $inputs.off('.cronuiMany');
                $inputs.each(function (_, el) {
                    $(el).siblings('[data-cronui-many-btn="1"]').remove();
                });
                $overlay.remove();
            }
        };
    };

})(jQuery, window);
