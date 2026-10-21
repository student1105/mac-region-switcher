function run(argv) {
  var apps = (argv[0] || '').split(',');
  if (apps.indexOf('chrome') >= 0) { var c=Application('com.google.Chrome'); if(c.running()) c.quit(); }
  if (apps.indexOf('safari') >= 0) { var s=Application('com.apple.Safari'); if(s.running()) s.quit(); }
}
