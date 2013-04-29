define(["marionette", "marionetteExtensions", "jquery.fastbutton"], function(Marionette) {

    var HeaderView = Marionette.View.extend({
        initialize : function(options) {
            this.states = options.states;
            this.initialState = options.initialState;
            this.model = new Backbone.Model({state: this.initialState}).on("change:state", this.onStateChange, this);
        },
        events : {
            "fastclick .back" : function() {

                if (this.model.get("state") === this.initialState) {
                    this.trigger("quit");
                } else {
                    this.changeStateTo(this.initialState);
                    this.trigger("back");
                }
            }
        },
        ui : {
            backButton : "#back-button",
            quitButton : "#quit-button"
        },
        onStateChange : function(model, state) {
            var title = this.states[state];
            this.$(".title-container").toggleClass("secondView");
            if(this.$(".title-container").hasClass("secondView")){
                this.$(".title-container h2").html(title);
            }else{
                this.$(".title-container h1").html(title);
            }
            //this.$(".title-container h1").html(title);

            if (state === this.initialState) {
                this.ui.backButton.hide();
                this.ui.quitButton.show();
            } else {
                this.ui.quitButton.hide();
                this.ui.backButton.show();
            }
        },
        changeStateTo : function(state) {
            this.model.set("state", state);
        }
    });

    return {
        HeaderView : HeaderView
    };
});

