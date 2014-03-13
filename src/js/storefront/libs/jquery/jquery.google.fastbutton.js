(function($) {
  $.event.special.fastclick = {
		setup: function () {
		    $(this).data('fastclick', new FastButton(this, $.event.special.fastclick.handler));
		},
		teardown: function () {
		   $(this).data('fastclick').destroy();
		   $(this).removeData('fastclick');
		},
		handler: function (e) {
			// convert native event to jquery event
			e = $.event.fix(e);
			e.type = 'fastclick';
		
			/*
			event.handle is deprecated and removed as of version 1.9
			use event.dispatch instead,
			$.event.handle.apply(this, arguments);
			*/
			$.event.dispatch.apply(this, arguments);
		}
	};

	$.fn.fastclick = function(fn) {
		return $(this).each(function() {
			return fn ? $(this).bind("fastclick", fn) : $(this).trigger("fastclick");
		});
	};
}(jQuery));

