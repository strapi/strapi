require([ 'gitbook' ], function (gitbook) {
    gitbook.events.bind('start', function (e, config) {
        var githubURL = config.github.url;

        gitbook.toolbar.createButton({
            icon: 'fa fa-github',
            label: 'GitHub',
            position: 'right',
            onClick: function() {
                window.open(githubURL)
            }
        });
    });
});
