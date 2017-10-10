/*!
 * Scrollspy Plugin
 * Author: r3plica
 * Licensed under the MIT license
 */
; (function ($, window, document, undefined) {

    // Add our plugin to fn
    $.fn.extend({

        // Scrollspy is the name of the plugin
        scrollspy: function (options) {

            // Define our defaults
            var defaults = {
                namespace: 'scrollspy',
                activeClass: 'active',
                animate: false,
                offset: 0,
                container: window
            };

            // Add any overriden options to a new object
            options = $.extend({}, defaults, options);

            // Adds two numbers together
            var add = function (ex1, ex2) {
                return parseInt(ex1, 10) + parseInt(ex2, 10);
            }

            // Find our elements
            var findElements = function (links) {

                // Declare our array
                var elements = [];

                // Loop through the links
                for (var i = 0; i < links.length; i++) {

                    // Get our current link
                    var link = links[i];

                    // Get our hash
                    var hash = $(link).attr("href");

                    // Store our has as an element
                    var element = $(hash);

                    // If we have an element matching the hash
                    if (element.length > 0) {

                        // Get our offset
                        var top = Math.floor(element.offset().top),
                            bottom = top + Math.floor(element.outerHeight());

                        // Add to our array
                        elements.push({ element: element, hash: hash, top: top, bottom: bottom });
                    }                    
                }

                // Return our elements
                return elements;
            };

            // Find our link from a hash
            var findLink = function (links, hash) {

                // For each link
                for (var i = 0; i < links.length; i++) {

                    // Get our current link
                    var link = $(links[i]);

                    // If our hash matches the link href
                    if (link.attr("href") === hash) {

                        // Return the link
                        return link;
                    }
                }
            };

            // Reset classes on our elements
            var resetClasses = function (links) {

                // For each link
                for (var i = 0; i < links.length; i++) {

                    // Get our current link
                    var link = $(links[i]);

                    // Remove the active class
                    link.parent().removeClass(options.activeClass);
                }
            };

            // For each scrollspy instance
            return this.each(function () {

                // Declare our global variables
                var element = this,
                    container = $(options.container);

                // Get our objects
                var links = $(element).find('a');

                // Loop through our links
                for (var i = 0; i < links.length; i++) {

                    // Get our current link
                    var link = links[i];

                    // Bind the click event
                    $(link).on("click", function (e) {
                        
                        // Get our target
                        var target = $(this).attr("href"),
                            $target = $(target);

                        // If we have the element
                        if ($target.length > 0) {

                            // Get it's scroll position
                            var top = add($target.offset().top, options.offset);
                            
                            // If animation is on
                            if (options.animate) {

                                // Animate our scroll
                                $('html, body').animate({ scrollTop: top }, 1000);
                            } else {

                                // Scroll to our position
                                window.scrollTo(0, top);
                            }
                            
                            // Prevent our link
                            e.preventDefault();
                        }
                    });
                }

                // Get our elements
                var elements = findElements(links);
                
                // Add a listener to the window
                container.bind('scroll.' + options.namespace, function () {
                    
                    // Get the position and store in an object
                    var position = {
                        top: add($(this).scrollTop(), Math.abs(options.offset)),
                        left: $(this).scrollLeft()
                    };

                    // Create a variable for our link
                    var link;

                    // Loop through our elements
                    for (var i = 0; i < elements.length; i++) {

                        // Get our current item
                        var current = elements[i];

                        // If we are within the boundries of our element
                        if (position.top >= current.top && position.top < current.bottom) {
                            
                            // get our element
                            var hash = current.hash;

                            // Get the link
                            link = findLink(links, hash);
                            
                            // If we have a link
                            if (link) {

                                // If we have an onChange function
                                if (options.onChange) {

                                    // Fire our onChange function 
                                    options.onChange(current.element, $(element), position);
                                }

                                // Reset the classes on all other link
                                resetClasses(links);

                                // Add our active link to our parent
                                link.parent().addClass(options.activeClass);

                                // break our loop 
                                break;
                            }
                        }
                    }

                    // If we don't have a link and we have a exit function
                    if (!link && options.onExit) {
                        
                        // Fire our onChange function 
                        options.onExit($(element), position);
                    }
                });

            });
        }
    });
})(jQuery, window, document, undefined);