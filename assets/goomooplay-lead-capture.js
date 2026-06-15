(function () {
    'use strict';

    var defaults = {
        endpoint: '',
        token: '',
        formSelector: '[data-goomooplay-lead-form]',
        preventDefault: false,
    };

    var settings = Object.assign({}, defaults, window.GoomooPlayLeadCRM || {});

    function field(form, names) {
        for (var i = 0; i < names.length; i += 1) {
            var input = form.querySelector('[name="' + names[i] + '"]');

            if (input && input.value) {
                return input.value.trim();
            }
        }

        return '';
    }

    function fieldBySelectors(form, selectors) {
        for (var i = 0; i < selectors.length; i += 1) {
            var input = form.querySelector(selectors[i]);

            if (input && input.value) {
                return input.value.trim();
            }
        }

        return '';
    }

    function firstNonEmpty(values) {
        for (var i = 0; i < values.length; i += 1) {
            if (values[i]) {
                return values[i];
            }
        }

        return '';
    }

    function utm() {
        var params = new URLSearchParams(window.location.search);
        var keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
        var result = {};

        keys.forEach(function (key) {
            if (params.has(key)) {
                result[key] = params.get(key);
            }
        });

        return result;
    }

    function inferSourceType(form) {
        if (form.getAttribute('data-goomooplay-source-type')) {
            return form.getAttribute('data-goomooplay-source-type');
        }

        if (form.id === 'WholesaleForm') {
            return 'wholesale';
        }

        if (form.id === 'InfluencerForm') {
            return 'influencer';
        }

        if (form.classList.contains('newsletter-form')) {
            return 'newsletter';
        }

        if (form.closest('.ai-chat-widget')) {
            return 'chat';
        }

        return field(form, ['source_type']) || 'other';
    }

    function inferCustomerType(sourceType) {
        if (sourceType === 'wholesale') {
            return 'wholesale';
        }

        if (sourceType === 'influencer') {
            return 'influencer';
        }

        return 'retail';
    }

    function payload(form) {
        var sourceType = inferSourceType(form);
        var firstName = field(form, ['first_name', 'contact[first_name]']);
        var lastName = field(form, ['last_name', 'contact[last_name]']);
        var fullName = firstNonEmpty([
            field(form, ['name', 'contact[name]']),
            fieldBySelectors(form, ['#ContactForm-name']),
        ]);

        return {
            name: firstNonEmpty([fullName, [firstName, lastName].join(' ').trim()]),
            email: firstNonEmpty([
                field(form, ['email', 'contact[email]']),
                fieldBySelectors(form, ['#ContactForm-email']),
            ]),
            phone: firstNonEmpty([
                field(form, ['phone', 'contact[phone]']),
                fieldBySelectors(form, ['#ContactForm-phone']),
            ]),
            source_page: window.location.href,
            source_type: sourceType,
            product_interest: firstNonEmpty([
                form.getAttribute('data-goomooplay-product-interest'),
                field(form, ['product_interest']),
                fieldBySelectors(form, ['#ContactForm-interest']),
                document.title,
            ]),
            country: firstNonEmpty([
                field(form, ['country', 'contact[country]']),
                fieldBySelectors(form, ['#ContactForm-country']),
            ]),
            customer_type: firstNonEmpty([
                form.getAttribute('data-goomooplay-customer-type'),
                field(form, ['customer_type']),
                inferCustomerType(sourceType),
            ]),
            utm: utm(),
            message: firstNonEmpty([
                field(form, ['message', 'contact[body]', 'body']),
                fieldBySelectors(form, ['#ContactForm-body', '#ContactForm-info']),
            ]),
        };
    }

    function sendLead(data) {
        if (! settings.endpoint || ! settings.token || ! data.email) {
            return Promise.resolve(false);
        }

        return fetch(settings.endpoint, {
            method: 'POST',
            keepalive: true,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-GoomooPlay-Token': settings.token,
            },
            body: JSON.stringify(data),
        }).then(function (response) {
            return response.ok;
        }).catch(function () {
            return false;
        });
    }

    function shouldPreventDefault(form) {
        return settings.preventDefault
            || form.getAttribute('data-goomooplay-prevent-default') === 'true';
    }

    function bind(form) {
        form.addEventListener('submit', function (event) {
            var data = payload(form);

            if (shouldPreventDefault(form)) {
                event.preventDefault();

                sendLead(data).then(function (ok) {
                    form.dispatchEvent(new CustomEvent('goomooplay:lead-captured', {
                        bubbles: true,
                        detail: { ok: ok },
                    }));
                });

                return;
            }

            sendLead(data);
        });
    }

    function boot() {
        document.querySelectorAll(settings.formSelector).forEach(bind);
    }

    window.GoomooPlayLeadCRM = Object.assign(settings, {
        payload: payload,
        sendLead: sendLead,
        boot: boot,
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
}());
