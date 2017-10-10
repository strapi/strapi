gitbook.events.bind('start', function(e, config) {
    anchors.options = config.anchorjs || {};
});

gitbook.events.bind('page.change', function() {
    anchors.add('h1,h2,h3,h4,h5');
});
