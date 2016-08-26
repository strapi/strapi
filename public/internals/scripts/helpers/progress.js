var readline = require('readline');

/**
 * Adds an animated progress indicator
 *
 * @param  {string} message      The message to write next to the indicator
 * @param  {number} amountOfDots The amount of dots you want to animate
 */
function animateProgress(message, amountOfDots) {
  if (typeof amountOfDots !== 'number') {
    amountOfDots = 3;
  }

  var i = 0;
  return setInterval(function () {
    readline.cursorTo(process.stdout, 0);
    i = (i + 1) % (amountOfDots + 1);
    var dots = new Array(i + 1).join('.');
    process.stdout.write(message + dots);
  }, 500);
}

module.exports = animateProgress;
