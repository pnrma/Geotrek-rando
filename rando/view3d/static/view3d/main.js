$(window).on("view:detail", function(e) {

    var view3d_url = $("#popup-view3d").data('url');

    $("a.view3d").click(function () {
        var slug = $(this).data('slug'),
            url = view3d_url.replace('empty', slug);

        var $popup = $("#popup-view3d"),
            $modalBody = $('.modal-body', $popup);

        $('<iframe />', {
            name: 'frame1',
            id: 'frame1',
            frameBorder: 0,
            src: url
        }).appendTo($modalBody);

        $popup.modal('show');
        $popup.on('hidden', function () {
            $popup.find('iframe').remove();
        });

        $popup.find('a.toggle-fullscreen').click(function () {
            var $fullscreenBtn = $(this);

            $fullscreenBtn.toggleClass('active');
            $modalBody.toggleClass('is-fullscreen');

            if ($fullscreenBtn.hasClass('active')) {

                var elem = $modalBody[0];
                if (elem.requestFullscreen) {
                  elem.requestFullscreen();
                } else if (elem.msRequestFullscreen) {
                  elem.msRequestFullscreen();
                } else if (elem.mozRequestFullScreen) {
                  elem.mozRequestFullScreen();
                } else if (elem.webkitRequestFullscreen) {
                  elem.webkitRequestFullscreen();
                }
            }
            else {

                if (document.exitFullscreen) {
                  document.exitFullscreen();
                } else if (document.msExitFullscreen) {
                  document.msExitFullscreen();
                } else if (document.mozCancelFullScreen) {
                  document.mozCancelFullScreen();
                } else if (document.webkitExitFullscreen) {
                  document.webkitExitFullscreen();
                }
            }

        });
    });
});
