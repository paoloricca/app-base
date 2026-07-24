(function ($) {

    function MultiLanguageTextBox(element, options) {

        this.$input = $(element);

        this.options = $.extend(true, {}, MultiLanguageTextBox.defaults, options);
        
        this.values = {};
        this.initialValues = {};

        this.create();
        this.bind();

        this.initializeProperties();

    }

    MultiLanguageTextBox.defaults = {

        languages: [
            { code: "IT", title: "Italiano" },
            { code: "GB", title: "English" },
            { code: "ES", title: "Spain" },
            { code: "CN", title: "Cinese" }
        ],

        values: {}

    };
    MultiLanguageTextBox.prototype.initializeProperties = function () {

        Object.defineProperty(this, "value", {

            get: () => {

                return $.extend(true, {}, this.values);

            },

            set: (values) => {

                this.load(values);

            }

        });

    };
    MultiLanguageTextBox.prototype.option = function (name, value) {

        // Getter
        if (arguments.length === 1) {
            return this.options[name];
        }

        // Setter
        this.options[name] = value;

    };
    MultiLanguageTextBox.prototype.resetOptions = function () {

        this.values = this.initialValues;

        this.load(this.values);

        this.refresh();

    };
    MultiLanguageTextBox.prototype.init = function (LanguageContext) {

        /* render plugin template */

        var templateString = $.ajax({
            type: "GET",
            url: "/controls/ui/control.ui.culture.textbox.ejs",
            async: false
        }).responseText

        templateString = ejs.render(templateString, { LanguageContext });
        templateString = templateString.split('label-title').join('label-title-' + this.options.Id);
        templateString = templateString.split('txt-culture-edit').join('txt-culture-edit-' + this.options.Id);

        return templateString;
    }
    MultiLanguageTextBox.prototype.create = function () {

        //console.log(this.values);

        let nav = $('<ul class="nav nav-tabs mt-2"></ul>');
        let content = $('<div class="tab-content border border-top-0 p-3"></div>');

        this.options.languages.forEach((lang, index) => {

            if (this.options.LanguageContext == lang.code) {
                active = "active"; show = "show active";
            } else {
                active = ""; show = "";
            }

            nav.append('<li class="nav-item"><a class="nav-link ' + active + '" data-bs-toggle="tab" id="tabs_' + this.options.Id + '_' + lang.code + '" data-bs-target="#tab_' + this.options.Id + '_' + lang.code + '">' + lang.code + '</a></li>');

            content.append('<div class="tab-pane ' + show + '" id="tab_' + this.options.Id + '_' + lang.code + '"><input type="textbox" id="text-' + this.options.Id + '_' + lang.code + '" class="form-control lang-input" required data-lang="' + lang.code + '" /></div>');

            this.values[lang.code] = this.options.values[lang.code] || "";

        });

        //console.log(this.values)

        /* init template */
        var templateString = this.init(
            this.options.LanguageContext
        );

        this.$tabs = this.$input;

        this.$tabs.append(templateString);

        this.$tabs.find('.tab-language').append(nav).append(content);

        this.$input.after(this.$tabs);

    }; 
    MultiLanguageTextBox.prototype.load = function (values) {

        let self = this;

        this.options.values = values;

        this.options.languages.forEach(function (lang) {

            self.values[lang.code] = values[lang.code] || "";

        });

        this.initialValues = $.extend(true, {}, this.values);

        this.setTitle(this.options.Title);

        this.setLabel(this.options.Label);

        this.setDefault();

        this.values.IT = values.IT || "";
        this.values.GB = values.GB || "";
        this.values.ES = values.ES || "";
        this.values.CN = values.CN || "";

        this.refresh();

        this.$input.trigger("loaded", [
            this.getValues()
        ]);

    };
    MultiLanguageTextBox.prototype.hide = function () {

        this.$tabs.find('.container-culture-textbox-edit').modal('hide');
    }
    MultiLanguageTextBox.prototype.show = function () {

        this.$tabs.find('.nav-link').removeClass('active');
        this.$tabs.find('.tab-pane').removeClass('show active');

        this.$tabs.find('#tabs_' + this.options.Id + '_' + this.options.LanguageContext).addClass('active');
        this.$tabs.find('#tab_' + this.options.Id + '_' + this.options.LanguageContext).addClass('show active');

        this.$tabs.find('.container-culture-textbox-edit').modal('show');

    }
    MultiLanguageTextBox.prototype.setDefault = function () {

        this.$tabs.find('#txt-culture-edit-' + this.options.Id).val(
            this.values[this.options.LanguageContext]
        ) 
    }
    MultiLanguageTextBox.prototype.setTitle = function (title) {

        //console.log(title);

        this.$tabs.find('.container-culture-textbox-edit-title').html(title);

    }
    MultiLanguageTextBox.prototype.setLabel = function (label) {

        this.$tabs.find('.label-title-' + this.options.Id).html(label);
        this.$tabs.find('.container-culture-textbox-edit-label').html(label);

    }
    MultiLanguageTextBox.prototype.bind = function () {

        let self = this;

        this.$tabs.find('.btn-cancel-container-culture-textbox-edit').click(function () {

            self.resetOptions();
            self.hide();

        })
        this.$tabs.find('.btn-confirm-container-culture-textbox-edit').click(function () {

            self.refreshValues();

            self.hide();

        })
        this.$tabs.find('#btn-gear').click(function () {

            self.options.languages.forEach((lang, index) => {

                self.values[lang.code] = self.options.values[lang.code] || "";

            });

            self.show();
            
        })
        this.$tabs.find('#txt-culture-edit-' + this.options.Id).change(function () {
            self.values[self.options.LanguageContext] = $(this).val();
            self.$tabs.find('#text-' + self.options.Id + '_' + self.options.LanguageContext).val($(this).val());

        })
        this.$tabs.on("input", ".lang-input", function () {

            let lang = $(this).data("lang");

            self.values[lang] = $(this).val();

            self.$input.val(self.values.it || "");

            self.$input.trigger("languageChanged", [lang, self.values[lang]]);

            self.$input.trigger("valueChanged", [self.values]);

            if ($(this).data('lang') == self.options.LanguageContext) {

                self.$tabs.find('#txt-culture-edit-' + self.options.Id).val($(this).val());
            }
        });

    };
    MultiLanguageTextBox.prototype.refreshValues = function () {

        var self = this;

        this.options.languages.forEach((lang, index) => {

            this.values[lang.code] = self.$tabs.find('#text-' + self.options.Id + '_' + lang.code).val();

        });
    }
    MultiLanguageTextBox.prototype.refresh = function () {

        let self = this;

        this.$tabs.find(".lang-input").each(function () {

            let lang = $(this).data("lang");

            $(this).val(self.values[lang]);

        });

        this.options.languages.forEach(function (lang) {

            self.$tabs.find('#text-' + self.options.Id + '_' + lang.code).val(self.values[lang.code]);

        });
        

        //this.$element.find("[data-lang='IT']").val(this.values.IT);
        //this.$element.find("[data-lang='GB']").val(this.values.GB);
        //this.$element.find("[data-lang='ES']").val(this.values.ES);
        //this.$element.find("[data-lang='CN']").val(this.values.CN);

    };
    MultiLanguageTextBox.prototype.setValue = function (lang, value) {

        this.values[lang] = value;

        this.refresh();

    };
    MultiLanguageTextBox.prototype.getValue = function (lang) {

        return this.options;

    };
    MultiLanguageTextBox.prototype.getValues = function () {

        return this.values;

    };
    MultiLanguageTextBox.prototype.clear = function () {

        for (let lang in this.values)
            this.values[lang] = "";

        this.refresh();

    };
    $.fn.multiLanguageTextBox = function (method) {

        if (typeof method === "string") {

            let args = Array.prototype.slice.call(arguments, 1);

            let instance = this.data("mltextbox");

            return instance[method].apply(instance, args);

        }
        return this.each(function () {
            if (!$.data(this, "mltextbox")) {

                $.data(this,
                    "mltextbox",
                    new MultiLanguageTextBox(this, method));

            }

        });
    };

})(jQuery);




//(function ($) {

//    function CultureEditor(element, options) {

//        this.$container = $(element);

//        this.options = $.extend({

//            LanguageContext: null,
//            Title: null,
//            Label: null,
//            Text_IT: null,
//            Text_GB: null,
//            Text_ES: null,
//            Text_CN: null,

//        }, options);

//        this.init();
//    }

//    CultureEditor.prototype = {

//        init: function () {

//            var templateString = this.getTemplate();

//            this.renderTemplate(templateString);

//            //this.$input = this.$container.find(".txt-value");
//            this.$buttonGear = this.$container.find("#btn-gear");
//            this.$cultureEditTextbox = this.$container.find(".txt-culture-edit");
//            this.$cultureLanguageIT = this.$container.find(".txt-language-IT");
//            this.$cultureLanguageGB = this.$container.find(".txt-language-GB");

//            this.bindEvents();

//            const self = this;

//            self.draw();

//        },
//        bindEvents: function () {

//            const self = this;

//            this.$buttonGear.on("click", function () {

//                self.show();

//            });

//            //this.$input.on("input", function () {

//            //    self.$container.trigger(
//            //        "valueChanged",
//            //        self.getValue()
//            //    );

//            //});

//        },
//        getTemplate: function () {
//            return $.ajax({
//                type: "GET",
//                url: "/controls/ui/control.ui.culture.textbox.ejs",
//                async: false
//            }).responseText
//        },
//        renderTemplate: function (templateString) {

//            var LanguageContext = 'IT';

//            /* render plugin template */
//            var partialToRender = ejs.render(templateString, { LanguageContext });

//            this.$container.html(partialToRender);

//        },
//        draw: function () {

//            var optionCultureTextbox = this.options;

//            var plugin = this.$container;

//            if (optionCultureTextbox.Title != null) {
//                plugin.find('.container-culture-textbox-edit-title').html(
//                    optionCultureTextbox.Title
//                );
//            }
//            if (optionCultureTextbox.Label != null) {
//                plugin.find('.container-culture-textbox-edit-label').html(
//                    optionCultureTextbox.Label
//                );
//            }
//            console.log(this.$cultureEditTextbox);

//            plugin.find('.label-title').html(optionCultureTextbox.Label);

//            plugin.find('.nav-link').removeClass('active');
//            plugin.find('.tab-pane').removeClass('show active');
//            plugin.find('.tab-language-' + optionCultureTextbox.LanguageContext).addClass('active');
//            plugin.find('.language-' + optionCultureTextbox.LanguageContext).addClass('show active');

//            if (optionCultureTextbox.LanguageContext == 'IT') {
//                this.$cultureEditTextbox.val(optionCultureTextbox.Text_IT);
//            }
//            if (optionCultureTextbox.LanguageContext == 'GB') {
//                this.$cultureEditTextbox.val(optionCultureTextbox.Text_GB);
//            }
//            if (optionCultureTextbox.LanguageContext == 'ES') {
//                this.$cultureEditTextbox.val(optionCultureTextbox.Text_ES);
//            }
//            if (optionCultureTextbox.LanguageContext == 'CN') {
//                this.$cultureEditTextbox.val(optionCultureTextbox.Text_CN);
//            }


//            if (optionCultureTextbox.Text_IT != null) {
//                this.$cultureLanguageIT.val(optionCultureTextbox.Text_IT);
//            }
//            if (optionCultureTextbox.Text_GB != null) {
//                this.$cultureLanguageGB.val(optionCultureTextbox.Text_GB);
//            }
//            if (optionCultureTextbox.Text_ES != null) {
//                plugin.find('.txt-language-ES').val(optionCultureTextbox.Text_ES);
//            }
//            if (optionCultureTextbox.Text_CN != null) {
//                plugin.find('.txt-language-CN').val(optionCultureTextbox.Text_CN);
//            }

//        },
//        show: function () {

//            const self = this;

//            self.draw();

//            this.$container.find('.container-culture-textbox-edit').modal('show');

//        },
//        hide: function () {

//        },
//        getValue: function () {

//            return this.$input.val();

//        },

//        setValue: function (value) {

//            this.$input.val(value);

//        },

//        setPlaceholder: function (text) {

//            this.$input.attr("placeholder", text);

//        },

//        disable: function () {

//            this.$input.prop("disabled", true);

//        },

//        enable: function () {

//            this.$input.prop("disabled", false);

//        }

//    };
//    $.fn.cultureEditor = function (options) {

//        return this.each(function () {

//            const instance = new CultureEditor(this, options);

//            $(this).data("cultureEditor", instance);

//        });

//    };

//})(jQuery);






//(function ($) {
//    $.fn.cultureTextbox = function (myoptions) {

//        var pluginId = Date.now();

//        let optionCultureTextbox = $.extend({
//            LanguageContext: null,
//            Title: null,
//            Label: null,
//            Text_IT: null,
//            Text_GB: null,
//            Text_ES: null,
//            Text_CN: null,
//            onconfirm: null,
//            oncancel: null,
//        }, myoptions);

//        var plugin = $(this);

//        $.fn.cultureTextbox.show = function (plugin) {
//            plugin.cultureTextbox.draw(plugin);
//            plugin.find('.container-culture-textbox-edit').modal('show');
//        }
//        $.fn.cultureTextbox.hide = function (plugin) {
//            plugin.find('.container-culture-textbox-edit').modal('hide');
//        }
//        $.fn.cultureTextbox.draw = function (plugin) {

//            var optionCultureTextbox = JSON.parse(plugin.attr('data-options'));

//            if (optionCultureTextbox.Title != null) {
//                plugin.find('.container-culture-textbox-edit-title').html(
//                    optionCultureTextbox.Title
//                );
//            }
//            if (optionCultureTextbox.Label != null) {
//                plugin.find('.container-culture-textbox-edit-label').html(
//                    optionCultureTextbox.Label
//                );
//            }

//            plugin.find('.label-title').html(optionCultureTextbox.Label);

//            $('#' + pluginId + '_').find('.nav-link').removeClass('active');
//            $('#' + pluginId + '_').find('.tab-pane').removeClass('show active');

//            //console.log(plugin);
//            //console.log(plugin.find('#' + pluginId + '_tab-language-' + optionCultureTextbox.LanguageContext));

//            plugin.find('#' + pluginId + '_tab-language-' + optionCultureTextbox.LanguageContext).addClass('active');
//            plugin.find('#' + pluginId + '_language-' + optionCultureTextbox.LanguageContext).addClass('show active');

//            if (optionCultureTextbox.LanguageContext == 'IT') {
//                plugin.find('#' + pluginId + '_txt-culture-edit').val(optionCultureTextbox.Text_IT);
//            }
//            if (optionCultureTextbox.LanguageContext == 'GB') {
//                plugin.find('#' + pluginId + '_txt-culture-edit').val(optionCultureTextbox.Text_GB);
//            }
//            if (optionCultureTextbox.LanguageContext == 'ES') {
//                plugin.find('#' + pluginId + '_txt-culture-edit').val(optionCultureTextbox.Text_ES);
//            }
//            if (optionCultureTextbox.LanguageContext == 'CN') {
//                plugin.find('#' + pluginId + '_txt-culture-edit').val(optionCultureTextbox.Text_CN);
//            }

//            if (optionCultureTextbox.Text_IT != null) {
//                plugin.find('#' + pluginId + '_txt-language-IT').val(optionCultureTextbox.Text_IT);
//            }
//            if (optionCultureTextbox.Text_GB != null) {
//                console.log(plugin.find('#' + pluginId + '_txt-language-GB'));
//                plugin.find('#' + pluginId + '_txt-language-GB').val(optionCultureTextbox.Text_GB);
//            }
//            if (optionCultureTextbox.Text_ES != null) {
//                plugin.find('#' + pluginId + '_txt-language-ES').val(optionCultureTextbox.Text_ES);
//            }
//            if (optionCultureTextbox.Text_CN != null) {
//                plugin.find('#' + pluginId + '_txt-language-CN').val(optionCultureTextbox.Text_CN);
//            }

//        };

//        /* initialize plugin instance */
//        plugin.attr('data-options', JSON.stringify(optionCultureTextbox));

//        /* load plugin template */
//        $.get("/controls/ui/control.ui.culture.textbox.ejs?" + pluginId, function (response) {
//            /* render plugin template */
//            renderTemplate(response);
//        });
//        function renderTemplate(templateString) {

//            templateString = templateString.split('id="').join('id="' + pluginId + '_');
//            templateString = templateString.split('name="').join('name="' + pluginId + '_');
//            templateString = templateString.split('data-bs-target="#').join('data-bs-target="#' + pluginId + '_');

//            var optionCultureTextbox = JSON.parse(plugin.attr('data-options'));

//            var LanguageContext = optionCultureTextbox.LanguageContext;

//            /* render plugin template */
//            var partialToRender = ejs.render(templateString, { LanguageContext });

//            /* fill plugin template */
//            plugin.html(partialToRender);
//            $('#' + pluginId + '_').find('#' + pluginId + '_txt-culture-edit').change(function (e) {

//                /* get plugin attribute option */
//                var optionCultureTextbox = JSON.parse(plugin.attr('data-options'));

//                /* set pluging attribute option */
//                if (optionCultureTextbox.LanguageContext == "IT") {
//                    optionCultureTextbox.Text_IT = $(this).val();
//                }
//                if (optionCultureTextbox.LanguageContext == "GB") {
//                    optionCultureTextbox.Text_GB = $(this).val();
//                }
//                if (optionCultureTextbox.LanguageContext == "ES") {
//                    optionCultureTextbox.Text_ES = $(this).val();
//                }
//                if (optionCultureTextbox.LanguageContext == "CN") {
//                    optionCultureTextbox.Text_CN = $(this).val();
//                }

//                /* re-store plugin attribute option */
//                plugin.attr('data-options', JSON.stringify(optionCultureTextbox));

//                if (optionCultureTextbox.LanguageContext == 'IT') {
//                    plugin.find('#' + pluginId + '_txt-language-IT').val(optionCultureTextbox.Text_IT);
//                }
//                if (optionCultureTextbox.LanguageContext == 'GB') {
//                    plugin.find('#' + pluginId + '_txt-language-GB').val(optionCultureTextbox.Text_GB);
//                }
//                if (optionCultureTextbox.LanguageContext == 'ES') {
//                    plugin.find('#' + pluginId + '_txt-language-ES').val(optionCultureTextbox.Text_ES);
//                }
//                if (optionCultureTextbox.LanguageContext == 'CN') {
//                    plugin.find('#' + pluginId + '_txt-language-CN').val(optionCultureTextbox.Text_CN);
//                }

//            });

//            plugin.cultureTextbox.draw(plugin);

//            $('#' + pluginId + '_').find('#' + pluginId + '_btn-gear').click(function (e) {
//                plugin.cultureTextbox.show(plugin);
//            });

//            /* raise plugin event */
//            plugin.find('a.btn-confirm-container-culture-textbox-edit').click(function (e) {

//                /* get plugin attribute option */
//                var optionCultureTextbox = JSON.parse(plugin.attr('data-options'));

//                /* set pluging attribute option */
//                optionCultureTextbox.Text_IT = plugin.find('#' + pluginId + '_txt-language-IT').val();
//                optionCultureTextbox.Text_GB = plugin.find('#' + pluginId + '_txt-language-GB').val();
//                optionCultureTextbox.Text_ES = plugin.find('#' + pluginId + '_txt-language-ES').val();
//                optionCultureTextbox.Text_CN = plugin.find('#' + pluginId + '_txt-language-CN').val();

//                //console.log(optionCultureTextbox);

//                /* re-store plugin attribute option */
//                plugin.attr('data-options', JSON.stringify(optionCultureTextbox));

//                if (optionCultureTextbox.LanguageContext == "IT") {
//                    plugin.find('#' + pluginId + '_txt-culture-edit').val(optionCultureTextbox.Text_IT);
//                }
//                if (optionCultureTextbox.LanguageContext == "GB") {
//                    plugin.find('#' + pluginId + '_txt-culture-edit').val(optionCultureTextbox.Text_GB);
//                }
//                if (optionCultureTextbox.LanguageContext == "ES") {
//                    plugin.find('#' + pluginId + '_txt-culture-edit').val(optionCultureTextbox.Text_ES);
//                }
//                if (optionCultureTextbox.LanguageContext == "CN") {
//                    plugin.find('#' + pluginId + '_txt-culture-edit').val(optionCultureTextbox.Text_CN);
//                }

//                /* raise event */
//                $(this).trigger("onconfirm");

//                plugin.cultureTextbox.hide(plugin);
//            });
//            plugin.find('a.btn-cancel-delete').click(function (e) {

//                /* raise event */
//                $(this).trigger("oncancel");
//            });
//        };

//        return plugin;

//    };
//}(jQuery));