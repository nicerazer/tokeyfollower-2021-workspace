"use strict";

$(document).ready(function () {

  $("#sidebar").mCustomScrollbar({
    theme: "minimal"
  });

  $('#sidebarCollapse').on('click', function () {
    // open or close navbar
    $('#sidebar').toggleClass('active');
    $('#admin-content').toggleClass('active');
    $('#sidebarCollapse').toggleClass('active');
    // close dropdowns
    $('.collapse-sidebar.in').toggleClass('in');
    // and also adjust aria-expanded attributes we use for the open/closed arrows
    // in our CSS
    $('a[aria-expanded=true]').attr('aria-expanded', 'false');
  });
	// Auto play modal video
	$(".video").click(function(){
		var
			theModal = $(this).data("target"),
			videoSRC = $(this).attr("data-video"),
			videoSRCauto = videoSRC + "?modestbranding=1&rel=0&controls=0&showinfo=0&html5=1&autoplay=1"; 
			$(theModal + ' iframe').attr('src', videoSRCauto);
			$(theModal + ' button.close').click(function(){
				$(theModal + ' iframe').attr('src', videoSRC);
			});
  });
});