require(['gitbook', 'jQuery'], function (gitbook, $) {
    var versions = [],
        current  = undefined,
        pluginConfig = {};

    // Update the select with a list of versions
    function updateVersions(_versions) {
        versions = _versions || versions;
        current  = $('.versions-select select').val() || current;

        // Cleanup existing selector
        $('.versions-select').remove();

        if (versions.length == 0) return;

        var $li = $('<li>', {
            'class': 'versions-select',
            'html': '<div><select></select></div>'
        });
        var $select = $li.find('select');

        $.each(versions, function(i, version) {
            var $option = $('<option>', {
                'selected': (current === undefined ? version.selected : (current === version.value)),
                'value': version.value,
                'text': version.text
            });

            $option.appendTo($select);
        });

        $select.change(function() {
            var filtered = $.grep(versions, function(v) {
                return v.value === $select.val();
            });
            // Get actual version Object from array
            var version = filtered[0];

            var filePath = location.href.replace(gitbook.state.bookRoot, '');
            window.location.href = version.includeFilepath? (version.value + filePath) : version.value;
        });

        $li.prependTo('.book-summary ul.summary');
    }

    // Fetch version from book.json (legacy plugin)
    function fetchBookOptionsVersions(gitbookConfigURL) {
        $.getJSON(gitbookConfigURL, function (bookConfig) {
            var options = bookConfig.pluginsConfig.versions.options;
            updateVersions(options);
        });
    }

    // Fetch gitbook.com versions
    function fetchBookVersions(type) {
        $.getJSON(gitbook.state.bookRoot+'gitbook/api/versions/'+type, function (versions) {
            updateVersions($.map(versions, function(v) {
                return {
                    text: v.name,
                    value: v.urls.website,
                    selected: v.current,
                    includeFilepath: pluginConfig.includeFilepath !== false && type !== 'languages'
                };
            }));
        });
    }

    gitbook.events.bind('start', function (e, config) {
        pluginConfig = config.versions || {};
        if (pluginConfig.options) updateVersions(pluginConfig.options);

        // Make sure we have a current book.json
        if (pluginConfig.gitbookConfigURL)  fetchBookOptionsVersions(pluginConfig.gitbookConfigURL);
        else fetchBookVersions(pluginConfig.type || 'branches');
    });

    gitbook.events.bind('page.change', function () {
        updateVersions();
    });
});
