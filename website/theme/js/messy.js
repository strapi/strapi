/**
 * Some messy JavaScript just to be more flexible
 * with MKDocs links and navigation...
 */

var url = document.URL;
var split = url.split('/');
$('.wy-nav-content').css("min-height", $('.stickynav').height() + 36);
if (split[3] === 'documentation' && split[4] === 'prologue' && split[5] === 'why') {
  $('#missing').css('display', 'none');
  $('.rst-footer-buttons > a:nth-child(2)').css('display', 'none');
} else if (split[3] === 'documentation' && split[4] === 'advanced' && split[5] === 'hooks') {
  $('.rst-footer-buttons > a:nth-child(1)').css('display', 'none');
} else if (split[3] === 'info') {
  $('#missing').css('display', 'none');
  $('.rst-footer-buttons').css('display', 'none');
}
