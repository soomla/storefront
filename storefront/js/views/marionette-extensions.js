define(["backbone", "marionette"], function(Backbone, Marionette) {

    _.extend(Marionette.View.prototype, {
        bubbleEventsTo : function(targetView) {
            this.on("all", function() {
                Marionette.View.prototype.trigger.apply(targetView, arguments);
            });
            return this;
        },

        // Mix in template helper methods. Looks for a
        // `templateHelpers` in view options or as attribute, which can either be an
        // object literal, or a function that returns an object
        // literal. All methods and attributes from this object
        // are copies to the object passed in.
        mixinTemplateHelpers: function(target){
            target = target || {};
            var templateHelpers = this.options.templateHelpers ? this.options.templateHelpers : this.templateHelpers;
            if (_.isFunction(templateHelpers)){
                templateHelpers = templateHelpers.call(this);
            }
            return _.extend(target, templateHelpers);
        },
        // Override Marionette's original "configureTriggers" so that
        // the events are triggered with the source view as an argument
        configureTriggers: function(){
            if (!this.triggers) { return; }

            var that = this;
            var triggerEvents = {};

            // Allow `triggers` to be configured as a function
            var triggers = _.result(this, "triggers");

            // Configure the triggers, prevent default
            // action and stop propagation of DOM events
            _.each(triggers, function(value, key){

                triggerEvents[key] = function(e){
                    if (e && e.preventDefault){ e.preventDefault(); }
                    if (e && e.stopPropagation){ e.stopPropagation(); }

                    // Add the source view as the argument
                    that.trigger(value, that.model);
                };

            });

            return triggerEvents;
        },
        // Override Marionette's "close" to enable not removing the DOM element
        // But just unbinding its events
        close: function(){
            if (this.isClosed) { return; }

            this.triggerMethod("before:close");

            // Allow the DOM node not to be removed but just unbound from events
            if (this.noRemove || this.options.noRemove) {
                this.$el.off()
            } else {
                this.remove();
            }
            this.unbindAll();

            this.triggerMethod("close");
            this.isClosed = true;
        }
    });

});