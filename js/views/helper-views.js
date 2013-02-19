define(["marionette", "marionetteExtensions", "jquery.fastbutton"], function(Marionette) {

    var HeaderView = Marionette.View.extend({
        initialize : function() {
            _.bindAll(this, "switchHeader");
            this.state = "menu";
        },
        events : {
            "fastclick .back" : function() {
                this.trigger(this.state == "menu" ? "quit" : "back");
            }
        },
        ui : {
            backButton : "#back-button",
            quitButton : "#quit-button"
        },
        switchHeader : function(title) {
            this.$(".title-container h1").html(title);

            if (this.state == "menu") {
                this.ui.backButton.hide();
                this.ui.quitButton.show();
            } else {
                this.ui.quitButton.hide();
                this.ui.backButton.show();
            }
        }
    });

    return {
        HeaderView : HeaderView
    };
});

