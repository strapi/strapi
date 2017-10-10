require(["gitbook"], function(gitbook) {
    gitbook.events.bind("page.change", function() {
      $('ul.summary > li > ul').hide();
      $('ul.summary > li[data-level="1.2"] > ul > li:not(.active) li').hide();
      $('ul.summary li li.active').parents().children(':not(script)').show();
      $('ul.summary li.active > ul').show();
      $('.page-headings').remove();

      var hasChildren = $('ul.summary li.active ul').length !== 0;

      if(!hasChildren) {
        var headingList = $('<ul class="page-headings">');

        $('.page-wrapper h2').each(function() {
          var link = $('<a>').html($(this).text())
            .attr('href', '#' + $(this).attr('id'));

          headingList.append($('<li>').append(link));
        });

        $('li.active').append(headingList);
        // headingList.scrollspy({
        //   container: $('.body-inner')
        // });
      }
    });
});
